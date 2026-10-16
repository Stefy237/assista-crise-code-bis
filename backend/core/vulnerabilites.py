"""Contrôle d'accès au registre communal des personnes vulnérables (recensement PCS) --
généralise le patron de habitations.py (délégation de compétence sur une commune), avec une
restriction SUPPLÉMENTAIRE pour la mairie elle-même : contrairement à une habitation (accédée par
toute la collectivité locale), un recensement de personnes vulnérables est réservé à la RCSC
(Team.est_equipe_rcsc, voir son docstring) et aux RESPONSABLE désignés -- PAS tout agent
municipal. Une institution tierce (association, AASC...) garde l'accès standard dès lors qu'elle
détient une DelegationCompetence active sur la commune concernée, sans restriction d'équipe
supplémentaire -- seule la mairie, qui "possède" nativement la compétence, doit en restreindre
l'usage interne."""
from django.db.models import Q
from django.utils import timezone

from .habitations import _delegation_couvre_commune
from .models import AffectationRoleOperationnel, DelegationCompetence, Team, UserRole

NOM_COMPETENCE_VULNERABILITES = "Recensement personnes vulnérables"
CODE_ROLE_RESPONSABLE = "RESPONSABLE"


def equipes_rcsc(institution) -> set:
    """IDs des Team formant la RCSC de `institution` : les équipes marquées
    `est_equipe_rcsc=True`, PLUS récursivement tout leur sous-arbre via `equipe_parente` (une
    RCSC scindée en sous-équipes reste UNE RCSC, voir Team.est_equipe_rcsc.__doc__)."""
    racines = set(
        Team.objects.filter(institution=institution, est_equipe_rcsc=True)
        .values_list("id", flat=True)
    )
    ids, frontiere = set(racines), list(racines)
    while frontiere:
        enfants = set(
            Team.objects.filter(equipe_parente_id__in=frontiere)
            .exclude(id__in=ids)
            .values_list("id", flat=True)
        )
        if not enfants:
            break
        ids |= enfants
        frontiere = list(enfants)
    return ids


def utilisateur_a_acces_rcsc(user, institution) -> bool:
    """True si `user` est RESPONSABLE actif de `institution` (AffectationRoleOperationnel) OU
    membre (leader ou membre) d'une Team de sa RCSC (ou sous-équipe) -- les deux voies coexistent
    : un RESPONSABLE peut piloter le registre sans être formellement dans l'équipe, un membre
    RCSC peut saisir sans avoir de rôle opérationnel déclaré."""
    if institution is None:
        return False
    if AffectationRoleOperationnel.objects.filter(
        utilisateur=user, institution=institution, role__code=CODE_ROLE_RESPONSABLE, actif=True,
    ).exists():
        return True
    ids_rcsc = equipes_rcsc(institution)
    if not ids_rcsc:
        return False
    return (
        Team.objects.filter(id__in=ids_rcsc, actif=True)
        .filter(Q(leader=user) | Q(members=user))
        .exists()
    )


def institution_accede_commune(request, commune_code: str) -> bool:
    """True si l'institution de l'appelant peut gérer le registre des personnes vulnérables de
    `commune_code` -- ADMINISTRATOR voit toujours tout. Pour une AUT_LOCALE sur sa propre
    commune, la commune seule ne suffit PAS (contrairement à habitations.institution_accede_
    commune) : il faut en plus `utilisateur_a_acces_rcsc`. Pour toute autre institution
    (association comprise), une délégation active sur la compétence "Recensement personnes
    vulnérables" couvrant la commune suffit -- accès standard, pas de restriction d'équipe."""
    from .permissions import get_effective_role

    user = getattr(request, "user", None)
    if not (user and user.is_authenticated):
        return False

    role = get_effective_role(request)
    if role == UserRole.ADMINISTRATOR:
        return True
    if not commune_code:
        return False

    institution = getattr(user, "institution", None)
    if institution is None:
        return False

    if role == UserRole.LOCAL_AUTHORITY and institution.commune_code == commune_code:
        return utilisateur_a_acces_rcsc(user, institution)

    delegations = DelegationCompetence.objects.filter(
        institution_cible=institution,
        competence__nom=NOM_COMPETENCE_VULNERABILITES,
        active=True,
    ).filter(Q(date_fin__isnull=True) | Q(date_fin__gt=timezone.now()))
    return any(_delegation_couvre_commune(d, commune_code) for d in delegations)


def communes_accessibles(request) -> list | None:
    """Liste des codes commune gérables par l'appelant, pour filtrer un queryset
    PersonneVulnerable -- `None` signifie "toutes" (ADMINISTRATOR). Liste vide = aucun accès.
    Même logique que habitations.communes_accessibles, avec le garde-fou RCSC/RESPONSABLE sur la
    branche LOCAL_AUTHORITY."""
    from .permissions import get_effective_role

    user = getattr(request, "user", None)
    if not (user and user.is_authenticated):
        return []

    role = get_effective_role(request)
    if role == UserRole.ADMINISTRATOR:
        return None

    institution = getattr(user, "institution", None)
    if institution is None:
        return []

    communes = set()
    if role == UserRole.LOCAL_AUTHORITY and institution.commune_code and utilisateur_a_acces_rcsc(user, institution):
        communes.add(institution.commune_code)

    delegations = DelegationCompetence.objects.filter(
        institution_cible=institution,
        competence__nom=NOM_COMPETENCE_VULNERABILITES,
        active=True,
    ).filter(Q(date_fin__isnull=True) | Q(date_fin__gt=timezone.now()))
    for d in delegations:
        communes.update(d.communes or [])
        # Un département délégué ne peut pas être listé exhaustivement en codes commune ici sans
        # requêter le référentiel Commune ; filter_personnes_vulnerables_queryset gère ce cas à
        # part via une condition OR sur le préfixe département, voir plus bas.

    return list(communes)


def filter_personnes_vulnerables_queryset(request, queryset):
    """Réduit `queryset` (PersonneVulnerable) aux communes accessibles à l'appelant -- même
    logique que habitations.filter_habitations_queryset (délégations au niveau département
    gérées via préfixe de commune_code), avec le garde-fou RCSC/RESPONSABLE en plus sur la
    branche LOCAL_AUTHORITY."""
    from .permissions import get_effective_role

    user = getattr(request, "user", None)
    if not (user and user.is_authenticated):
        return queryset.none()

    role = get_effective_role(request)
    if role == UserRole.ADMINISTRATOR:
        return queryset

    institution = getattr(user, "institution", None)
    if institution is None:
        return queryset.none()

    filtre = Q(pk__in=[])  # base vide, complétée ci-dessous

    if role == UserRole.LOCAL_AUTHORITY and institution.commune_code and utilisateur_a_acces_rcsc(user, institution):
        filtre |= Q(commune_code=institution.commune_code)

    delegations = DelegationCompetence.objects.filter(
        institution_cible=institution,
        competence__nom=NOM_COMPETENCE_VULNERABILITES,
        active=True,
    ).filter(Q(date_fin__isnull=True) | Q(date_fin__gt=timezone.now()))
    for d in delegations:
        if not d.communes and not d.departements and d.zone_precise is None:
            return queryset  # délégation sans restriction = accès à tout (rare)
        if d.communes:
            filtre |= Q(commune_code__in=d.communes)
        for dep in d.departements or []:
            filtre |= Q(commune_code__startswith=dep)

    return queryset.filter(filtre)
