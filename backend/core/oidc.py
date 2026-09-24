"""Fournisseur OIDC pour Synapse (Matrix) : Django sert de fournisseur d'identité (SSO) via
django-oauth-toolkit -- même compte assista-crise des deux côtés, demande explicite de Sylvain
(23/09) plutôt que des comptes Matrix indépendants. `preferred_username` porte le localpart
déterministe calculé par core.matrix.matrix_localpart, pour que le mapping OIDC->utilisateur
Matrix de Synapse retombe systématiquement sur le même compte que celui pré-provisionné par le
pont (voir matrix-bridge/bridge.py)."""
from oauth2_provider.oauth2_validators import OAuth2Validator

from .matrix import matrix_localpart


class AssistaCriseOIDCValidator(OAuth2Validator):

    oidc_claim_scope = dict(OAuth2Validator.oidc_claim_scope)
    oidc_claim_scope.update({
        "preferred_username": "profile",
        "name": "profile",
    })

    def get_additional_claims(self, request):
        user = request.user
        return {
            "sub": str(user.id),
            "email": user.email,
            "email_verified": True,
            "preferred_username": matrix_localpart(user),
            "name": (f"{user.first_name} {user.last_name}".strip() or user.email),
        }
