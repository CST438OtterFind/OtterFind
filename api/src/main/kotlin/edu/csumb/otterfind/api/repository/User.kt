package edu.csumb.otterfind.api.repository

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Table
import org.springframework.data.repository.ListCrudRepository
import java.time.Instant

/**
 * An account, made by `V3__users.sql`. An access token's subject is this row's [id]. Sign-in finds the account by
 * [oauthProvider] and [oauthProviderUserId], never by email (Appendix I, section 3.5).
 */
@Table("users")
data class User(
    @Id val id: Long? = null,
    val email: String?,
    val displayName: String,
    val role: String,
    val oauthProvider: String,
    val oauthProviderUserId: String,
    val createdAt: Instant,
)

/** Reads accounts from Postgres. */
interface UserRepository : ListCrudRepository<User, Long> {
    /** Finds the account with this email, if there is one. */
    fun findByEmail(email: String): User?
}
