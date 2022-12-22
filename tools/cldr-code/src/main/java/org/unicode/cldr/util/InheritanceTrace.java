package org.unicode.cldr.util;

public class InheritanceTrace {
    private final String DEBUG_PATH = "//ldml/units/unitLength[@type=\"short\"]/unit[@type=\"duration-hour\"]/unitPattern[@count=\"one\"]";

    private final boolean debug; // specific to this path/locale

    private final int id;

    static int idCounter = 1;

    private final String pathWhereStarted;
    private final String localeWhereStarted;

    private String pathWhereFound;
    private String localeWhereFound;
    private InheritanceCategory category = InheritanceCategory.UNKNOWN;

    public InheritanceTrace(String pathWhereStarted, String localeWhereStarted, String caller) {
        this.id = idCounter++;
        this.pathWhereStarted = pathWhereStarted;
        this.localeWhereStarted = localeWhereStarted;
        this.debug = DEBUG_PATH.equals(pathWhereStarted);
        if (debug) {
            System.out.println();
        }
        print("New from " + caller + " " + localeWhereStarted + " " + pathWhereStarted);
    }

    public String getPathWhereStarted() {
        return pathWhereStarted;
    }

    public String getLocaleWhereStarted() {
        return localeWhereStarted;
    }

    public String getPathWhereFound() {
        return pathWhereFound;
    }

    public void setPathWhereFound(String pathWhereFound) {
        this.pathWhereFound = pathWhereFound;
    }

    public String getLocaleWhereFound() {
        return localeWhereFound;
    }

    public void setLocaleWhereFound(String localeWhereFound) {
        this.localeWhereFound = localeWhereFound;
    }


    public void set(XMLSource.AliasLocation aliasLocation, InheritanceCategory category) {
        setLocaleWhereFound(aliasLocation.localeWhereFound);
        setPathWhereFound(aliasLocation.pathWhereFound);
        setCategory(category);
    }

    public InheritanceCategory getCategory() {
        return category;
    }

    public void setCategory(InheritanceCategory category) {
        this.category = category;
        if (debug) {
            print("set category " + category + "; found at " + localeWhereFound + " " + pathWhereFound);
        }
    }

    public void print(String message) {
        if (debug) {
            System.out.println("InheritanceTrace: " + id + " " + message);
        }
    }

    public enum InheritanceCategory {
        VERTICAL, CHUTES, LATERAL, SPECIAL_LATERAL, CONSTRUCTED, FALLBACK, UNKNOWN
    }
}
