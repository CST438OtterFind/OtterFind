package edu.csumb.otterfind.api.repository

import org.springframework.data.annotation.Id
import org.springframework.data.jdbc.repository.query.Query
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

    /** Checks for email conflicts without treating an email as the sign-in identity. */
    fun findByEmailIgnoreCase(email: String): User?

    /** Uses the stable provider ID rather than a mutable email or GitHub login name. */
    fun findByOauthProviderAndOauthProviderUserId(oauthProvider: String, oauthProviderUserId: String): User?

    /** An atomic insert prevents simultaneous sign-ins from creating duplicate accounts. Null means a unique key already exists. */
    @Query(
        """INSERT INTO users (email, display_name, role, oauth_provider, oauth_provider_user_id, created_at)
           VALUES (:email, :displayName, 'USER', :oauthProvider, :oauthProviderUserId, :createdAt)
           ON CONFLICT DO NOTHING RETURNING id""",
    )
    fun insertIfAbsent(email: String, displayName: String, oauthProvider: String, oauthProviderUserId: String, createdAt: Instant): Long?
}
