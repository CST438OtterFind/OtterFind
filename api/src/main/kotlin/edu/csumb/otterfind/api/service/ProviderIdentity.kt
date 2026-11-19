package edu.csumb.otterfind.api.service

/** Identity verified by a provider, ready for account lookup (Appendix I, section 3.5). */
data class ProviderIdentity(
    val provider: String,
    val providerUserId: String,
    val email: String,
    val emailVerified: Boolean,
    val displayName: String,
)
