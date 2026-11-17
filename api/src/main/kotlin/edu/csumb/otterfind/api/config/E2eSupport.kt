package edu.csumb.otterfind.api.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.core.env.Environment
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.invoke
import org.springframework.security.web.SecurityFilterChain

/** Adds the test account. Never active in production. See docs/adr/0001-e2e-test-sign-in.md. */
const val E2E_PROFILE = "e2e"

private val LOCAL_DATABASE_HOSTS = setOf("localhost", "127.0.0.1", "db")

/**
 * Stops the API from starting with test sign-in anywhere it could do harm.
 *
 * @throws IllegalStateException if `prod` is also active, or the database isn't local.
 */
fun requireSafeE2eEnvironment(activeProfiles: List<String>, databaseUrl: String) {
    check("prod" !in activeProfiles) { "The e2e and prod profiles must never be active together" }
    val host = Regex("^jdbc:postgresql://([^:/?]+)").find(databaseUrl)?.groupValues?.get(1)
    check(databaseUrl.startsWith("jdbc:h2:") || host in LOCAL_DATABASE_HOSTS) { "The e2e profile only runs against a local database" }
}

/** Opens the test token route, which only exists under the e2e profile, and checks that the environment is safe for it. */
@Configuration
@Profile(E2E_PROFILE)
class E2eSupport(environment: Environment, @Value("\${spring.datasource.url}") databaseUrl: String) {
    init {
        requireSafeE2eEnvironment(environment.activeProfiles.toList(), databaseUrl)
    }

    /** Runs before the main chain, so the test token route needs no token. */
    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    fun testAuthFilterChain(http: HttpSecurity): SecurityFilterChain {
        http {
            securityMatcher("/test/**")
            cors { }
            csrf { disable() }
            authorizeHttpRequests { authorize(anyRequest, permitAll) }
        }
        return http.build()
    }
}
