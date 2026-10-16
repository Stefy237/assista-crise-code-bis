from django.db import migrations

# Liste de départ croisée sur 3 vrais PCS (Floirac 33 ~17000 hab., Saint-Sixt 74, Canet-de-Salars
# 12 <500 hab.) le 12/10 : aucune des 3 communes n'a la même liste de risques -- confirme que ce
# catalogue doit rester librement extensible (voir RisqueMajeurType), ce seed n'est qu'un point
# de départ, pas une liste exhaustive ni obligatoire.
RISQUES = [
    ("Inondation", "Débordement d'un cours d'eau ou submersion, pouvant toucher des zones basses, des habitations et des infrastructures situées en zone inondable."),
    ("Mouvement de terrain", "Chutes de pierres, glissements de terrain ou coulées boueuses, liés à la nature des sols et du relief (falaises, coteaux, versants argileux)."),
    ("Effondrement de cavités souterraines", "Affaissement ou effondrement brutal lié à d'anciennes carrières ou cavités naturelles (karstiques) sous le sol."),
    ("Transport de matières dangereuses", "Accident lors du transport routier, ferroviaire, fluvial ou par canalisation de matières dangereuses, pouvant causer explosion, incendie ou émanation toxique."),
    ("Séisme", "Secousse sismique pouvant endommager bâtiments et infrastructures selon l'intensité et la proximité de l'épicentre."),
    ("Tempête", "Vents violents, pouvant causer chutes d'arbres, dégâts sur les toitures et coupures de réseaux (électricité, télécommunications)."),
    ("Canicule", "Épisode de chaleur intense et prolongée, à risque notamment pour les personnes âgées, isolées ou fragiles."),
    ("Risque sanitaire (pandémie)", "Propagation d'une maladie infectieuse à grande échelle, pouvant nécessiter des mesures de confinement et de continuité des services essentiels."),
    ("Rupture de barrage", "Rupture ou rupture partielle d'un ouvrage de retenue d'eau, provoquant une onde de submersion brutale en aval."),
    ("Radon", "Exposition à un gaz radioactif naturel pouvant s'accumuler dans les bâtiments selon la nature géologique du sous-sol."),
    ("Nucléaire", "Incident ou accident sur une installation nucléaire pouvant conduire à un rejet d'éléments radioactifs, pour les communes situées dans le périmètre d'un plan particulier d'intervention."),
]

ROLES_PCS = [
    ("DOS", "Directeur des Opérations de Secours"),
    ("RAC", "Responsable de l'Action Communale"),
    ("CORRESPONDANT_COM", "Correspondant communication"),
    ("CORRESPONDANT_LOG", "Correspondant logistique"),
    ("CORRESPONDANT_POP", "Correspondant population"),
    ("CORRESPONDANT_SECU", "Correspondant sécurité"),
]


def seed(apps, schema_editor):
    RisqueMajeurType = apps.get_model("core", "RisqueMajeurType")
    for nom, generalites in RISQUES:
        RisqueMajeurType.objects.get_or_create(nom=nom, defaults={"generalites": generalites})

    RoleOperationnel = apps.get_model("core", "RoleOperationnel")
    for code, libelle in ROLES_PCS:
        RoleOperationnel.objects.get_or_create(code=code, defaults={"libelle": libelle})


def remove(apps, schema_editor):
    RisqueMajeurType = apps.get_model("core", "RisqueMajeurType")
    RisqueMajeurType.objects.filter(nom__in=[nom for nom, _ in RISQUES]).delete()
    RoleOperationnel = apps.get_model("core", "RoleOperationnel")
    RoleOperationnel.objects.filter(code__in=[code for code, _ in ROLES_PCS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0196_risquemajeurtype_pointoperationnel_accepte_animaux_and_more"),
    ]

    operations = [
        migrations.RunPython(seed, remove),
    ]
