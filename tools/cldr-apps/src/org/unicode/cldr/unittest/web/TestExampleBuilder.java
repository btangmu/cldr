package org.unicode.cldr.unittest.web;

import org.unicode.cldr.web.ExampleBuilder;

import com.ibm.icu.dev.test.TestFmwk;

/**
 * Unit tests for the ExampleBuilder object
 */
public class TestExampleBuilder extends TestFmwk {

    public static void main(String[] args) {
        new TestExampleBuilder().run(args);
    }
   
    /**
     * Test getting started with test framework
     *
     * NOTE: each test function must begin with "Test" or it will be ignored.
     */
    public void TestEBTest() {
        System.out.println("✅ " + "Hello, my name is TestEBTest!");
        assertNotNull("Testing null not null", null); // meant to fail
        String msg = "Failing intentionally";
        errln("❌ " + msg);
    }

    /**
     * Test ExampleBuilder.getInstance
     *
     * NOTE: each test function must begin with "Test" or it will be ignored.
     */
    public void TestEBGetInstance() {
        System.out.println("✅ " + "Hello, my name is TestEBGetInstance!");
        // ExampleBuilder eb = ExampleBuilder.getInstance(sm.getTranslationHintsFile(), sm.getTranslationHintsExample(), cldrFile);
        ExampleBuilder eb = ExampleBuilder.getInstance(null, null, null);
        assertNotNull("Testing ExampleBuilder not null ❌", eb);
    }

}
