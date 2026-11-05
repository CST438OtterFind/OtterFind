package edu.csumb.otterfind.api.config

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer
import org.springframework.boot.test.context.runner.ApplicationContextRunner
import kotlin.test.assertEquals

/** Checks that application.yaml reads the variable names render.yaml and compose.yaml set. */
class ApplicationYamlTest {
    private val runner = ApplicationContextRunner()
        .withInitializer(ConfigDataApplicationContextInitializer())
        .withPropertyValues(
            "DATABASE_URL=jdbc:postgresql://db.test:5432/otterfind",
            "DATABASE_USER=otterfind_user",
            "DATABASE_PASSWORD=otterfind_password",
            "APP_JWT_SECRET_BASE64=c2VjcmV0",
            "APP_JWT_ISSUER=http://issuer.test",
        )

    @Test
    fun `server port comes from PORT, which Render sets`() {
        runner.withPropertyValues("PORT=10000").run {
            assertEquals("10000", it.environment.getProperty("server.port"))
        }
    }

    @Test
    fun `server port falls back to 8080 for local runs`() {
        runner.run {
            assertEquals("8080", it.environment.getProperty("server.port"))
        }
    }

    @Test
    fun `datasource comes from the DATABASE variables`() {
        runner.run {
            assertEquals("jdbc:postgresql://db.test:5432/otterfind", it.environment.getProperty("spring.datasource.url"))
            assertEquals("otterfind_user", it.environment.getProperty("spring.datasource.username"))
            assertEquals("otterfind_password", it.environment.getProperty("spring.datasource.password"))
        }
    }

    @Test
    fun `token settings come from the APP_JWT variables`() {
        runner.run {
            assertEquals("c2VjcmV0", it.environment.getProperty("app.jwt.secret-base64"))
            assertEquals("http://issuer.test", it.environment.getProperty("app.jwt.issuer"))
        }
    }

    @Test
    fun `missing token variables resolve to blank, so startup validation catches them`() {
        ApplicationContextRunner().withInitializer(ConfigDataApplicationContextInitializer()).run {
            assertEquals("", it.environment.getProperty("app.jwt.secret-base64"))
            assertEquals("", it.environment.getProperty("app.jwt.issuer"))
        }
    }

    @Test
    fun `browser origins come from APP_CORS_ORIGINS`() {
        runner.withPropertyValues("APP_CORS_ORIGINS=http://localhost:8081").run {
            assertEquals("http://localhost:8081", it.environment.getProperty("app.cors.origins"))
        }
    }

    @Test
    fun `browser origins may be unset so the first deploy can start before the web client exists`() {
        runner.run {
            assertEquals("", it.environment.getProperty("app.cors.origins"))
        }
    }
}
