package edu.csumb.otterfind.api.service

import edu.csumb.otterfind.api.config.AppProperties
import org.junit.jupiter.api.Test
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.content
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withException
import org.springframework.test.web.client.response.MockRestResponseCreators.withStatus
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient
import org.springframework.web.server.ResponseStatusException
import java.io.IOException
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse

class GitHubIdentityClientTest {
    private val builder = RestClient.builder()
    private val server = MockRestServiceServer.bindTo(builder).build()
    private val credentials = AppProperties.GitHub("test-client", "test-secret")
    private val client = GitHubIdentityClient(credentials, builder.build())

    private fun exchange() = client.exchange("test-code", "test-verifier", "http://localhost:8081/auth")

    private fun tokenResponse(body: String = """{"access_token":"test-provider-token","token_type":"bearer","scope":"user:email"}""") {
        val form = LinkedMultiValueMap<String, String>().apply {
            add("client_id", "test-client")
            add("client_secret", "test-secret")
            add("code", "test-code")
            add("code_verifier", "test-verifier")
            add("redirect_uri", "http://localhost:8081/auth")
        }
        server.expect(requestTo("https://github.com/login/oauth/access_token"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Accept", "application/json"))
            .andExpect(content().contentType(MediaType.APPLICATION_FORM_URLENCODED))
            .andExpect(content().formData(form))
            .andRespond(withSuccess(body, MediaType.APPLICATION_JSON))
    }

    private fun userResponse(body: String = """{"id":12345,"login":"octocat","name":"Octo Cat","email":"untrusted@example.test"}""") {
        server.expect(requestTo("https://api.github.com/user"))
            .andExpect(method(HttpMethod.GET))
            .andExpect(header("Authorization", "Bearer test-provider-token"))
            .andRespond(withSuccess(body, MediaType.APPLICATION_JSON))
    }

    private fun emailsResponse(body: String) {
        server.expect(requestTo("https://api.github.com/user/emails"))
            .andExpect(header("Authorization", "Bearer test-provider-token"))
            .andRespond(withSuccess(body, MediaType.APPLICATION_JSON))
    }

    @Test
    fun `exchanges PKCE form and selects verified primary email instead of public profile email`() {
        tokenResponse()
        userResponse()
        emailsResponse("""[
            {"email":"secondary@example.test","verified":true,"primary":false},
            {"email":"private@example.test","verified":true,"primary":true,"visibility":"private"}
        ]""")
        assertEquals(ProviderIdentity("GITHUB", "12345", "private@example.test", true, "Octo Cat"), exchange())
        server.verify()
    }

    @Test
    fun `login name is the fallback display name`() {
        tokenResponse()
        userResponse("""{"id":12345,"login":"octocat","name":null}""")
        emailsResponse("""[{"email":"primary@example.test","verified":true,"primary":true}]""")
        assertEquals("octocat", exchange().displayName)
        server.verify()
    }

    @Test
    fun `unverified primary email is rejected even when a secondary email is verified`() {
        tokenResponse()
        userResponse()
        emailsResponse("""[
            {"email":"primary@example.test","verified":false,"primary":true},
            {"email":"secondary@example.test","verified":true,"primary":false}
        ]""")
        assertEquals(HttpStatus.BAD_REQUEST, assertFailsWith<ResponseStatusException> { exchange() }.statusCode)
        server.verify()
    }

    @Test
    fun `GitHub may reject an expired code with HTTP 200 and an error object`() {
        tokenResponse("""{"error":"bad_verification_code","error_description":"private-provider-detail"}""")
        val error = assertFailsWith<ResponseStatusException> { exchange() }
        assertEquals(HttpStatus.BAD_REQUEST, error.statusCode)
        assertFalse(error.toString().contains("private-provider-detail"))
        server.verify()
    }

    @Test
    fun `provider outages return a safe gateway error`() {
        server.expect(requestTo("https://github.com/login/oauth/access_token"))
            .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR).body("private-provider-detail"))
        val error = assertFailsWith<ResponseStatusException> { exchange() }
        assertEquals(HttpStatus.BAD_GATEWAY, error.statusCode)
        assertFalse(error.toString().contains("private-provider-detail"))
        server.verify()
    }

    @Test
    fun `network failure returns a safe gateway error`() {
        server.expect(requestTo("https://github.com/login/oauth/access_token")).andRespond(withException(IOException("timeout")))
        assertEquals(HttpStatus.BAD_GATEWAY, assertFailsWith<ResponseStatusException> { exchange() }.statusCode)
        server.verify()
    }

    @Test
    fun `missing access token cannot authenticate`() {
        tokenResponse("""{"scope":"user:email"}""")
        assertEquals(HttpStatus.BAD_GATEWAY, assertFailsWith<ResponseStatusException> { exchange() }.statusCode)
        server.verify()
    }

    @Test
    fun `missing provider user ID cannot authenticate`() {
        tokenResponse()
        userResponse("""{"login":"octocat"}""")
        assertEquals(HttpStatus.BAD_GATEWAY, assertFailsWith<ResponseStatusException> { exchange() }.statusCode)
        server.verify()
    }

    @Test
    fun `missing credentials are rejected before any network request`() {
        val unconfigured = GitHubIdentityClient(AppProperties.GitHub(), builder.build())
        val error = assertFailsWith<ResponseStatusException> { unconfigured.exchange("code", "verifier", "http://localhost:8081/auth") }
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.statusCode)
        server.verify()
    }

    @Test
    fun `missing PKCE verifier is rejected before any network request`() {
        val error = assertFailsWith<ResponseStatusException> { client.exchange("code", "", "http://localhost:8081/auth") }
        assertEquals(HttpStatus.BAD_REQUEST, error.statusCode)
        server.verify()
    }

    @Test
    fun `finds a verified primary email on the next page without following arbitrary link hosts`() {
        tokenResponse()
        userResponse()
        server.expect(requestTo("https://api.github.com/user/emails"))
            .andRespond(withSuccess("[{\"email\":\"secondary@example.test\",\"verified\":true,\"primary\":false}]", MediaType.APPLICATION_JSON)
                .header("Link", "<https://untrusted.example/user/emails?page=2>; rel=\"next\""))
        server.expect(requestTo("https://api.github.com/user/emails?page=2"))
            .andExpect(header("Authorization", "Bearer test-provider-token"))
            .andRespond(withSuccess("[{\"email\":\"primary@example.test\",\"verified\":true,\"primary\":true}]", MediaType.APPLICATION_JSON))
        assertEquals("primary@example.test", exchange().email)
        server.verify()
    }

    @Test
    fun `malformed token JSON returns a safe gateway error`() {
        tokenResponse("not-json")
        assertEquals(HttpStatus.BAD_GATEWAY, assertFailsWith<ResponseStatusException> { exchange() }.statusCode)
        server.verify()
    }
}
