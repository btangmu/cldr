// Copied from ICU4J 57.1
/**
 * ****************************************************************************** Copyright (C)
 * 2000-2004, International Business Machines Corporation and * others. All Rights Reserved. *
 * ******************************************************************************
 */
package org.unicode.cldr.icu.dev.test;

public interface TestLog {

    /** Adds given string to the log if we are in verbose mode. */
    void log(String message);

    void logln(String message);

    /** Report an error */
    void err(String message);

    void errln(String message);

    /** Warn about missing tests or data. */
    void warn(String message);

    void warnln(String message);

    public static final int LOG = 0;
    public static final int WARN = 1;
    public static final int ERR = 2;

    void msg(String message, int level, boolean incCount, boolean newln);
}
