"""Thèmes "à l'écoute" pour les formulaires publics (Request/Offer/Information) -- une
institution déclarée ACTEUR opérationnel sur une crise (voir ImplicationInstitution) doit
désormais déclarer au moins un Besoin qu'elle écoute (voir ImplicationInstitutionViewSet
.perform_create/perform_update). Ce module calcule, pour une crise et une commune données,
l'union des Besoins effectivement à l'écoute -- consommé par TypesALecouteView (AllowAny) pour
filtrer le sélecteur de type des formulaires publics avant tout dépôt."""
from .models import Besoin, Commune, ImplicationInstitution, StatutImplication, TypeImplication


def _institution_couvre_commune(institution, commune_code: str, commune: "Commune | None") -> bool:
    """Même principe que zone_scoping.py/_institution_secteur_or_400, mais pour une institution
    ARBITRAIRE (celle d'une ImplicationInstitution) plutôt que celle de l'utilisateur appelant
    -- compare le secteur effectif de l'institution (commune_code/epci_code/departement_code/
    region_code dénormalisés, voir Institution.save()) à celui de la commune ciblée."""
    niveau = institution.secteur_niveau_effectif or "commune"
    if niveau == "national":
        return True
    if niveau == "commune":
        return institution.commune_code == commune_code
    if commune is None:
        return False
    if niveau == "epci":
        return bool(institution.epci_code) and institution.epci_code == commune.epci_code
    if niveau == "departement":
        return bool(institution.departement_code) and institution.departement_code == commune.departement_code
    if niveau == "region":
        return bool(institution.region_code) and institution.region_code == commune.region_code
    return False


def besoins_a_lecoute(crise, commune_code: str):
    """Besoins qu'au moins une institution ACTEUR (validée, active) écoute pour `crise`, dont le
    secteur couvre `commune_code` -- IMPLIQUE n'y figure jamais (une institution seulement
    concernée par la crise ne fournit pas d'aide, voir ImplicationInstitution.__doc__)."""
    commune = Commune.objects.filter(code=commune_code).first()
    implications = ImplicationInstitution.objects.filter(
        crise=crise, actif=True, statut=StatutImplication.VALIDEE,
        type_implication=TypeImplication.ACTEUR,
    ).select_related("institution").prefetch_related("themes")

    besoin_ids = set()
    for implication in implications:
        if _institution_couvre_commune(implication.institution, commune_code, commune):
            besoin_ids.update(implication.themes.values_list("id", flat=True))

    return Besoin.objects.filter(id__in=besoin_ids)
