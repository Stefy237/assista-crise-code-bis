"""Proxy TCP pour un nœud Meshtastic WiFi partagé entre plusieurs consommateurs (téléphone,
Home Assistant, assista-crise) — pendant de meshcore-bridge/proxy.py, mais PAS pour la même
raison : contrairement à un companion MeshCore série (qui n'accepte qu'UNE seule connexion à la
fois, constaté en pratique), un vrai nœud Meshtastic WiFi accepte déjà nativement plusieurs
connexions TCP simultanées sur son API (port 4403 par défaut) — ce proxy n'est donc PAS
nécessaire pour "débloquer" un partage impossible autrement. Il sert à autre chose, demandé
explicitement : donner à tous les clients UNE seule adresse stable à connaître (celle du proxy,
pas celle du vrai nœud, potentiellement amenée à changer), et amortir une coupure/reconnexion
réseau au nœud réel sans que chaque client ait à ré-implémenter sa propre logique de retry.

Format de trame — lu directement dans le code source de la lib officielle `meshtastic`
(stream_interface.py : START1=0x94, START2=0xC3, HEADER_LEN=4), PAS deviné depuis de la
documentation :
  trame = 0x94 + 0xC3 + longueur (2 octets, BIG-endian — contrairement à MeshCore qui est en
  little-endian, voir meshcore-bridge/proxy.py) + payload protobuf.
  - payload envoyé par un client    : `ToRadio` (meshtastic.protobuf.mesh_pb2.ToRadio)
  - payload envoyé par le nœud réel : `FromRadio` (meshtastic.protobuf.mesh_pb2.FromRadio)

Routage :
  - trame d'un client -> nœud réel : transmise telle quelle, sans verrou ni file d'attente
    (contrairement à MeshCore) — un nœud Meshtastic gère nativement plusieurs commandes en vol,
    c'est justement ce que fait déjà son firmware pour ses propres clients TCP multiples.
  - trame du nœud réel -> clients : la quasi-totalité du trafic (paquets mesh, télémétrie,
    NodeInfo, position...) est diffusée à TOUS les clients connectés — exactement ce qu'un vrai
    nœud ferait lui-même en multi-client.
    SEULE EXCEPTION, la rafale de configuration initiale qu'un client demande à la connexion
    (`ToRadio.want_config_id`, entier aléatoire tiré par CE client) : le nœud y répond par une
    rafale de trames (MyInfo, un NodeInfo par nœud connu, Channel, Config...) qui ne porte cet
    identifiant que sur sa toute DERNIÈRE trame (`FromRadio.config_complete_id`, voir
    mesh_interface.py:_startConfig dans la lib vendue). Comme une seule connexion réelle est
    partagée ici, le proxy intercepte les `want_config_id`, sérialise les rafales concurrentes
    (verrou — une seule à la fois), et ne livre la rafale collectée qu'au client qui l'a
    demandée : sans ça, CHAQUE client recevrait le nodedb complet à chaque connexion d'un AUTRE
    client, et pourrait confondre sa configId avec celle d'un tiers.
    Le trafic "vivant" arrivant PENDANT cette rafale est quand même rediffusé aux autres clients
    déjà connectés (voir `_router_depuis_upstream`) — seul le client en cours de configuration
    ne le reçoit pas séparément : il se retrouvera mêlé à sa propre rafale, sans perte ni
    confusion de protocole possible (les trames restent des `FromRadio` bien formés, le client
    les traite selon leur propre type, peu importe l'ordre exact de réception).

⚠️ NON TESTÉ CONTRE UN VRAI NŒUD WIFI À CE JOUR — écrit à partir du protocole documenté dans le
code source de la lib `meshtastic` (déjà vendue dans ce projet, voir bridge.py et son mode TCP,
validé le 13/09 — voir README.md), en miroir du proxy MeshCore déjà en prod. Mais aucun nœud
WiFi Meshtastic n'est actuellement configuré dans cet environnement pour vérifier bout en bout
la logique de rafale de configuration ci-dessus (`want_config_id`/`config_complete_id`) : à
valider avec un vrai appareil avant un usage en cellule de crise réelle.

IMPORTANT : chaque client (app officielle, intégration Home Assistant, assista-crise) doit être
reconfiguré pour se connecter à CE proxy (host/port de ce service) plutôt que directement au
nœud réel — sinon rien n'est mutualisé.
"""

import asyncio
import logging
import os
import socket

from meshtastic.mesh_interface import NODELESS_WANT_CONFIG_ID
from meshtastic.protobuf import mesh_pb2

try:
    from zeroconf import ServiceInfo
    from zeroconf.asyncio import AsyncZeroconf
except ImportError:
    ServiceInfo = None
    AsyncZeroconf = None

logger = logging.getLogger("meshtastic-proxy")

START1 = 0x94
START2 = 0xC3

UPSTREAM_HOST = os.environ.get("MESHTASTIC_TCP_HOST")
UPSTREAM_PORT = int(os.environ.get("MESHTASTIC_TCP_PORT", "4403"))
if not UPSTREAM_HOST:
    raise RuntimeError("MESHTASTIC_TCP_HOST est requis (adresse IP du vrai nœud Meshtastic WiFi).")
LISTEN_HOST = os.environ.get("PROXY_LISTEN_HOST", "0.0.0.0")
LISTEN_PORT = int(os.environ.get("PROXY_LISTEN_PORT", "4403"))
RECONNECT_DELAY_SECONDS = int(os.environ.get("RECONNECT_DELAY_SECONDS", "5"))
# Garde-fou si le nœud réel ne renvoie jamais le config_complete_id attendu (déconnexion en plein
# milieu de la rafale, par ex.) — le client reçoit tout de même ce qui a déjà été collecté.
TIMEOUT_CONFIG_SECONDS = float(os.environ.get("TIMEOUT_CONFIG_SECONDS", "15"))
# Intervalle du heartbeat périodique une fois la connexion établie — 250s, sous les 300s par
# défaut de la lib officielle (mesh_interface.py:_startHeartbeat), marge de sécurité. Ce qui
# compte le plus n'est PAS cette valeur mais l'envoi d'un PREMIER heartbeat immédiatement après
# la fin de la toute première rafale de config (voir _demarrer_handshake_propre) : constaté en
# pratique le 2026-09-26, le nœud réel referme la connexion en moins de 3-5s si rien n'arrive
# juste après cette rafale — la lib officielle y échappe car elle envoie son 1er heartbeat dans
# le même tick que la détection de fin de rafale (_connected() -> _startHeartbeat() -> callback()
# immédiat), pas seulement au bout du 1er intervalle.
HEARTBEAT_INTERVAL_SECONDS = float(os.environ.get("HEARTBEAT_INTERVAL_SECONDS", "250"))

# Marqueur non-writer utilisé comme "client" fictif pour la poignée de main que le proxy fait
# lui-même à la connexion (voir _demarrer_handshake_propre) — jamais présent dans self.clients,
# donc jamais confondu avec un vrai client par _router_depuis_upstream/_envoyer.
_SENTINEL_PROPRE = object()

# Annonce mDNS : le firmware Meshtastic officiel (nœuds WiFi) s'annonce lui-même en
# "_meshtastic._tcp.local." pour la découverte réseau de l'app — ce proxy fait pareil, avec
# "role"=proxy dans les properties pour se distinguer d'un vrai nœud si besoin. Même logique
# best-effort que meshcore-bridge/proxy.py (zeroconf absent ou réseau sans multicast -> le proxy
# continue sans, juste non découvrable automatiquement).
MDNS_SERVICE_TYPE = "_meshtastic._tcp.local."
MDNS_ACTIF = os.environ.get("PROXY_MDNS_ANNONCE", "true").strip().lower() not in ("0", "false", "non")
MDNS_NOM_INSTANCE = os.environ.get("PROXY_MDNS_NOM", socket.gethostname())


def _lire_trames(tampon: bytearray):
    """Extrait toutes les trames FromRadio/ToRadio complètes disponibles dans `tampon` (mutable,
    vidé au fur et à mesure) — même principe que meshcore-bridge/proxy.py:_lire_trames, mais
    marqueur sur 2 octets (0x94 0xC3, pas 1) et longueur BIG-endian (voir stream_interface.py de
    la lib officielle). Ignore tout octet parasite avant un marqueur, en préservant un éventuel
    dernier octet 0x94 pouvant être le début d'un marqueur coupé entre deux lectures réseau."""
    trames = []
    while True:
        idx = tampon.find(bytes([START1, START2]))
        if idx < 0:
            if len(tampon) > 1:
                del tampon[:-1]
            break
        if idx > 0:
            del tampon[:idx]
        if len(tampon) < 4:
            break
        taille = int.from_bytes(tampon[2:4], "big", signed=False)
        if len(tampon) < 4 + taille:
            break
        payload = bytes(tampon[4:4 + taille])
        del tampon[:4 + taille]
        trames.append(payload)
    return trames


def _encadrer(payload: bytes) -> bytes:
    return bytes([START1, START2]) + len(payload).to_bytes(2, "big") + payload


def _ip_locale_annoncable() -> str | None:
    """Voir meshcore-bridge/proxy.py, même fonction et même technique (aucun paquet réellement
    envoyé, juste une connexion UDP factice pour lire l'IP source choisie par le noyau)."""
    if LISTEN_HOST not in ("0.0.0.0", "::", ""):
        return LISTEN_HOST
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


class ProxyMeshtastic:
    def __init__(self):
        self.upstream_writer: asyncio.StreamWriter | None = None
        self._mdns_zeroconf: "AsyncZeroconf | None" = None
        self._mdns_info: "ServiceInfo | None" = None
        self.clients: set[asyncio.StreamWriter] = set()
        # Une seule rafale de configuration collectée à la fois — un 2e client demandant sa
        # config pendant qu'on en collecte déjà une attend simplement son tour (verrou), pour ne
        # jamais mélanger deux rafales dans le même tampon de collecte.
        self.verrou_config = asyncio.Lock()
        self.config_id_en_cours: int | None = None
        self.client_en_config: asyncio.StreamWriter | None = None
        self.frames_config: list[bytes] = []
        self.evenement_config_terminee: asyncio.Event | None = None
        self._tache_heartbeat: asyncio.Task | None = None

    async def demarrer(self):
        asyncio.create_task(self._boucle_upstream())
        await self._annoncer_mdns()
        serveur = await asyncio.start_server(self._gerer_client, LISTEN_HOST, LISTEN_PORT)
        logger.info("Proxy en écoute sur %s:%s (nœud réel : %s:%s).", LISTEN_HOST, LISTEN_PORT, UPSTREAM_HOST, UPSTREAM_PORT)
        try:
            async with serveur:
                await serveur.serve_forever()
        finally:
            await self._retirer_annonce_mdns()

    async def _annoncer_mdns(self):
        if AsyncZeroconf is None:
            logger.warning("zeroconf non installé — annonce mDNS désactivée.")
            return
        if not MDNS_ACTIF:
            logger.info("Annonce mDNS désactivée (PROXY_MDNS_ANNONCE=false).")
            return
        ip = _ip_locale_annoncable()
        if ip is None:
            logger.warning("Impossible de déterminer une IP locale à annoncer — mDNS désactivé.")
            return
        nom_service = f"{MDNS_NOM_INSTANCE}.{MDNS_SERVICE_TYPE}"
        info = ServiceInfo(
            MDNS_SERVICE_TYPE, nom_service,
            addresses=[socket.inet_aton(ip)], port=LISTEN_PORT,
            server=f"{MDNS_NOM_INSTANCE}.local.",
            properties={"role": "proxy", "protocole": "meshtastic"},
        )
        zc = AsyncZeroconf()
        try:
            await zc.async_register_service(info)
        except Exception:
            logger.exception("Échec de l'annonce mDNS — le proxy continue sans.")
            await zc.async_close()
            return
        self._mdns_zeroconf = zc
        self._mdns_info = info
        logger.info("Annoncé en mDNS : %s (%s:%s)", nom_service, ip, LISTEN_PORT)

    async def _retirer_annonce_mdns(self):
        if self._mdns_zeroconf is None:
            return
        try:
            await self._mdns_zeroconf.async_unregister_service(self._mdns_info)
        except Exception:
            logger.exception("Échec du retrait de l'annonce mDNS.")
        finally:
            await self._mdns_zeroconf.async_close()
            self._mdns_zeroconf = None

    async def _boucle_upstream(self):
        while True:
            tache_lecture = None
            try:
                logger.info("Connexion au nœud réel %s:%s...", UPSTREAM_HOST, UPSTREAM_PORT)
                reader, writer = await asyncio.open_connection(UPSTREAM_HOST, UPSTREAM_PORT)
                self.upstream_writer = writer
                # Désactive l'algorithme de Nagle : sans ça, un petit paquet (ex: notre
                # heartbeat de 6 octets encadrés) peut rester quelques ms en attente côté OS
                # avant émission réelle — marge qu'on ne peut pas se permettre de perdre vu le
                # délai très court observé entre fin de rafale et fermeture par le nœud réel
                # (constaté le 2026-09-26, souvent < 20ms).
                sock = writer.get_extra_info("socket")
                if sock is not None:
                    sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
                # Préambule de réveil envoyé par tout vrai client avant d'attendre quoi que ce
                # soit (voir stream_interface.py:connect() de la lib officielle — 32 octets
                # START2, PAS START1+START2, exactement comme le fait la lib) : sans lui, le
                # nœud réel referme la connexion presque aussitôt (constaté en pratique le
                # 2026-09-26 — connexion acceptée puis coupée sans réponse dans la seconde).
                writer.write(bytes([START2] * 32))
                await writer.drain()
                await asyncio.sleep(0.1)
                logger.info("Connecté au nœud réel.")

                # La boucle de lecture doit déjà tourner AVANT la poignée de main ci-dessous
                # (elle attend une réponse du nœud réel, reçue par cette même boucle) — d'où la
                # tâche séparée plutôt qu'un simple `await` bloquant.
                tache_lecture = asyncio.create_task(self._boucle_lecture_upstream(reader))
                await self._demarrer_handshake_propre()
                self._tache_heartbeat = asyncio.create_task(self._boucle_heartbeat())
                await tache_lecture
            except Exception:
                logger.exception("Connexion au nœud réel perdue, nouvelle tentative dans %ds.", RECONNECT_DELAY_SECONDS)
                self.upstream_writer = None
                if self.evenement_config_terminee is not None and not self.evenement_config_terminee.is_set():
                    self.evenement_config_terminee.set()
                if self._tache_heartbeat is not None:
                    self._tache_heartbeat.cancel()
                    self._tache_heartbeat = None
                if tache_lecture is not None:
                    tache_lecture.cancel()
                await asyncio.sleep(RECONNECT_DELAY_SECONDS)

    async def _boucle_lecture_upstream(self, reader: asyncio.StreamReader):
        tampon = bytearray()
        while True:
            data = await reader.read(4096)
            if not data:
                raise ConnectionError("nœud réel déconnecté")
            tampon.extend(data)
            for payload in _lire_trames(tampon):
                await self._router_depuis_upstream(payload)

    async def _demarrer_handshake_propre(self):
        """Le proxy se comporte lui-même comme un client dès la connexion établie — demande sa
        propre rafale de configuration (`want_config_id` fictif, via `_SENTINEL_PROPRE`, jamais
        livrée à un vrai client) puis envoie IMMÉDIATEMENT un heartbeat dès la fin de cette
        rafale. Voir le commentaire de HEARTBEAT_INTERVAL_SECONDS : c'est cette immédiateté,
        pas la fréquence des heartbeats suivants, qui évite au nœud réel de refermer la
        connexion juste après avoir fini de l'envoyer.

        Utilise NODELESS_WANT_CONFIG_ID (valeur spéciale demandant au nœud de NE PAS envoyer sa
        base de nœuds connus, voir mesh_interface.py de la lib officielle) plutôt qu'un id
        aléatoire : constaté en direct le 2026-09-26 via l'interface web de diagnostic du nœud
        (http://<IP>/json/report) que son heap_free ne représente qu'environ 8% de son
        heap_total — la rafale COMPLÈTE (avec nodedb, ~15 Ko/153 trames observées) épuise cette
        mémoire déjà rare et le nœud referme alors la connexion, quel que soit le délai de
        réponse du client (testé : heartbeat immédiat et TCP_NODELAY n'ont rien changé). Le
        proxy n'a de toute façon pas besoin de cette base pour lui-même — un vrai client
        (téléphone, Home Assistant) qui la demande via son PROPRE want_config_id la reçoit
        normalement, sans changement de comportement pour lui."""
        mon_config_id = NODELESS_WANT_CONFIG_ID
        async with self.verrou_config:
            self.config_id_en_cours = mon_config_id
            self.client_en_config = _SENTINEL_PROPRE
            self.frames_config = []
            self.evenement_config_terminee = asyncio.Event()

            to_radio = mesh_pb2.ToRadio()
            to_radio.want_config_id = mon_config_id
            self.upstream_writer.write(_encadrer(to_radio.SerializeToString()))
            await self.upstream_writer.drain()

            try:
                await asyncio.wait_for(self.evenement_config_terminee.wait(), timeout=TIMEOUT_CONFIG_SECONDS)
                logger.info("Poignée de main initiale avec le nœud réel terminée (%d trame(s)).", len(self.frames_config))
            except asyncio.TimeoutError:
                logger.warning("Pas de config_complete_id reçu pour la poignée de main initiale — on continue quand même.")
            finally:
                self.client_en_config = None
                self.config_id_en_cours = None
                self.evenement_config_terminee = None
        await self._envoyer_heartbeat()

    async def _boucle_heartbeat(self):
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL_SECONDS)
            await self._envoyer_heartbeat()

    async def _envoyer_heartbeat(self):
        if self.upstream_writer is None:
            return
        try:
            hb = mesh_pb2.ToRadio()
            hb.heartbeat.CopyFrom(mesh_pb2.Heartbeat())
            self.upstream_writer.write(_encadrer(hb.SerializeToString()))
            await self.upstream_writer.drain()
            logger.debug("Heartbeat envoyé au nœud réel.")
        except Exception:
            logger.exception("Échec d'envoi du heartbeat au nœud réel.")

    async def _router_depuis_upstream(self, payload: bytes):
        trame = _encadrer(payload)

        if self.client_en_config is not None:
            self.frames_config.append(trame)
            fin_rafale = False
            try:
                from_radio = mesh_pb2.FromRadio()
                from_radio.ParseFromString(payload)
                fin_rafale = (
                    from_radio.WhichOneof("payload_variant") == "config_complete_id"
                    and from_radio.config_complete_id == self.config_id_en_cours
                )
            except Exception:
                logger.debug("Trame FromRadio illisible pendant une rafale de config, ignorée pour la détection de fin.")
            # Trafic vivant potentiellement mêlé à la rafale : rediffusé aux AUTRES clients déjà
            # connectés (voir docstring du module) — seul celui en cours de configuration ne le
            # reçoit pas séparément, il l'a déjà dans sa propre rafale collectée.
            for client in list(self.clients):
                if client is not self.client_en_config:
                    await self._envoyer(client, trame)
            if fin_rafale and self.evenement_config_terminee is not None:
                self.evenement_config_terminee.set()
            return

        for client in list(self.clients):
            await self._envoyer(client, trame)

    async def _gerer_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        pair = writer.get_extra_info("peername")
        logger.info("Client connecté : %s", pair)
        self.clients.add(writer)
        tampon = bytearray()
        try:
            while True:
                data = await reader.read(4096)
                if not data:
                    break
                tampon.extend(data)
                for payload in _lire_trames(tampon):
                    await self._traiter_trame_client(writer, payload)
        except Exception:
            logger.exception("Erreur avec le client %s.", pair)
        finally:
            logger.info("Client déconnecté : %s", pair)
            self.clients.discard(writer)
            if self.client_en_config is writer and self.evenement_config_terminee is not None:
                self.evenement_config_terminee.set()
            try:
                writer.close()
            except Exception:
                pass

    async def _traiter_trame_client(self, writer: asyncio.StreamWriter, payload: bytes):
        if self.upstream_writer is None:
            logger.warning("Trame cliente reçue mais nœud réel non connecté, ignorée.")
            return
        try:
            to_radio = mesh_pb2.ToRadio()
            to_radio.ParseFromString(payload)
            est_want_config = to_radio.WhichOneof("payload_variant") == "want_config_id"
        except Exception:
            est_want_config = False

        if not est_want_config:
            self.upstream_writer.write(_encadrer(payload))
            await self.upstream_writer.drain()
            return

        async with self.verrou_config:
            if self.upstream_writer is None:
                logger.warning("Nœud réel déconnecté juste avant l'envoi, want_config_id abandonné.")
                return
            logger.info("Rafale de configuration demandée par %s (id=%d).", writer.get_extra_info("peername"), to_radio.want_config_id)
            self.config_id_en_cours = to_radio.want_config_id
            self.client_en_config = writer
            self.frames_config = []
            self.evenement_config_terminee = asyncio.Event()

            self.upstream_writer.write(_encadrer(payload))
            await self.upstream_writer.drain()

            try:
                await asyncio.wait_for(self.evenement_config_terminee.wait(), timeout=TIMEOUT_CONFIG_SECONDS)
            except asyncio.TimeoutError:
                logger.warning("Pas de config_complete_id reçu dans le délai — %d trame(s) tout de même livrée(s).", len(self.frames_config))
            finally:
                self.client_en_config = None
                self.config_id_en_cours = None
                self.evenement_config_terminee = None

            logger.debug("Rafale de configuration complète : %d trame(s) pour ce client.", len(self.frames_config))
            for trame_config in self.frames_config:
                await self._envoyer(writer, trame_config)

    async def _envoyer(self, writer: asyncio.StreamWriter, trame: bytes):
        try:
            writer.write(trame)
            await writer.drain()
        except Exception:
            logger.exception("Échec d'envoi vers un client, retiré.")
            self.clients.discard(writer)


async def main():
    proxy = ProxyMeshtastic()
    await proxy.demarrer()


if __name__ == "__main__":
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    asyncio.run(main())
