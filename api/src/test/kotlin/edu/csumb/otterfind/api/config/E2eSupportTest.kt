package edu.csumb.otterfind.api.config

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertDoesNotThrow
import kotlin.test.assertFailsWith

class E2eSupportTest {
    @Test
    fun `runs against the compose database, a local one and H2`() {
        assertDoesNotThrow {
            requireSafeE2eEnvironment(listOf("e2e"), "jdbc:postgresql://db:5432/otterfind")
            requireSafeE2eEnvironment(listOf("e2e"), "jdbc:postgresql://localhost:5432/otterfind")
            requireSafeE2eEnvironment(listOf("test", "e2e"), "jdbc:h2:mem:otterfind")
        }
    }

    @Test
    fun `refuses to run alongside the prod profile`() {
        assertFailsWith<IllegalStateException> { requireSafeE2eEnvironment(listOf("e2e", "prod"), "jdbc:postgresql://db:5432/otterfind") }
    }

    @Test
    fun `refuses a hosted database, even with no prod profile, because Render has none set`() {
        assertFailsWith<IllegalStateException> {
            requireSafeE2eEnvironment(listOf("e2e"), "jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres")
        }
    }

    @Test
    fun `refuses a URL it can't read`() {
        assertFailsWith<IllegalStateException> { requireSafeE2eEnvironment(listOf("e2e"), "not-a-url") }
    }
}
