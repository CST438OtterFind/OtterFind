package edu.csumb.otterfind.api.service

import edu.csumb.otterfind.api.repository.User
import edu.csumb.otterfind.api.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.util.Locale

/** Applies Appendix I's account rules using the provider columns on users; accounts are never linked by email. */
@Service
class AccountService(private val users: UserRepository, private val clock: Clock) {
    /** Reuses a provider identity, or creates a USER account after checking the verified email. */
    fun findOrCreate(identity: ProviderIdentity): User {
        findIdentity(identity)?.let { return it }
        if (!identity.emailVerified || identity.email.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Verify your email at the provider before signing in.")
        }
        val email = identity.email.trim().lowercase(Locale.ROOT)
        users.findByEmailIgnoreCase(email)?.let { return requireSameIdentity(it, identity) }
        // This statement commits before the follow-up lookup. A concurrent insert can win either unique constraint.
        val id = users.insertIfAbsent(email, identity.displayName, identity.provider, identity.providerUserId, clock.instant())
        return if (id != null) users.findById(id).orElseThrow() else resolveConcurrentSignIn(identity, email)
    }

    private fun findIdentity(identity: ProviderIdentity): User? =
        users.findByOauthProviderAndOauthProviderUserId(identity.provider, identity.providerUserId)

    private fun resolveConcurrentSignIn(identity: ProviderIdentity, email: String): User {
        findIdentity(identity)?.let { return it }
        val existing = users.findByEmailIgnoreCase(email)
        throw existing?.let { emailConflict(it) }
            ?: ResponseStatusException(HttpStatus.CONFLICT, "Another sign-in changed this account. Please try again.")
    }

    private fun requireSameIdentity(user: User, identity: ProviderIdentity): User {
        if (user.oauthProvider != identity.provider || user.oauthProviderUserId != identity.providerUserId) {
            throw emailConflict(user)
        }
        return user
    }

    private fun emailConflict(user: User): ResponseStatusException {
        val provider = if (user.oauthProvider == "GOOGLE") "Google" else "GitHub"
        return ResponseStatusException(
            HttpStatus.CONFLICT,
            "This email is already registered. Sign in with your original $provider account.",
        )
    }
}
