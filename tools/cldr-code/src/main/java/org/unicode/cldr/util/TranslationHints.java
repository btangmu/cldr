package org.unicode.cldr.util;

import org.unicode.cldr.draft.FileUtilities;

import java.util.*;

public class TranslationHints {

    final static private String HINTS_FILE = "data/translation-hints/hints.txt";

    private static Map<String,String> xpathToHint = null;

    public static String get(String xpath) {
        if (xpathToHint == null) {
            initXpathToHint();
        }
        return xpathToHint.get(xpath);
    }

    private static void initXpathToHint() {
        xpathToHint = new HashMap<>();
        String hint = null;
        for (String line : FileUtilities.in(TranslationHints.class, HINTS_FILE)) {
            if (line.startsWith("HINT:")) {
                hint = line.substring(5).trim();
            } else if (line.startsWith("PATH:")) {
                final String xpath = line.substring(5).trim();
                if (hint == null) {
                    throw new RuntimeException("Bad file, must set HINT before PATH: " + HINTS_FILE);
                }
                xpathToHint.put(xpath, hint);
            }
        }
    }

    /*
    private static void writeHints() {
        Map<String, List<String>> hintToXpaths = new TreeMap<>();
        for (Map.Entry<String, String> entry : xpathToHint.entrySet()) {
            String xpath = entry.getKey();
            String hint = entry.getValue();
            hint = hint.substring(0, 1).toLowerCase() + hint.substring(1);
            if (hint.matches("\\.$")) {
                hint = hint.substring(0, hint.length() - 1); // delete final period if present
            }
            List<String> list = hintToXpaths.computeIfAbsent(hint, k -> new ArrayList<>());
            list.add(xpath);
        }
        System.out.println("{");
        for (Map.Entry<String, List<String>> entry : hintToXpaths.entrySet()) {
            String hint = entry.getKey();
            List<String> list = entry.getValue();
            Collections.sort(list);
            System.out.println("HINT: " + hint);
            for (String xpath : list) {
                System.out.println("PATH: " + xpath);
            }
            System.out.println("");
        }
    }

    private static void initXpathToHint(CLDRFile translationHintsFile) {
        xpathToHint = new HashMap<>();
        for (String xpath : translationHintsFile) {
            String val = translationHintsFile.getStringValue(xpath);
            if (val != null && val.contains("translation hint")) {
                String hint = getHint(val);
                if (hint == null) {
                    System.out.println("DID NOT RECOGNIZE HINT: " + val);
                } else {
                    xpathToHint.put(xpath, hint);
                }
            }
        }
    }

    private static String getHint(String val) {
        val = val.replace("[", "(");
        val = val.replace("]", ")");
        Pattern p = Pattern.compile("\\(translation hint: ([^)]+)\\)");
        Matcher m = p.matcher(val);
        return m.find() ? m.group(1) : null;
    }
    */
}
