package org.unicode.cldr.util;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TranslationHints {
    private static Map<String,String> xpathToHint = null;

    public static String get(String xpath, CLDRFile translationHintsFile) {
        if (xpathToHint == null) {
            initXpathToHint(translationHintsFile);
        }
        return xpathToHint.get(xpath);
    }

    private static void initXpathToHint(CLDRFile translationHintsFile) {
        xpathToHint = new HashMap<>();
        int count = 0;
        for (String xpath : translationHintsFile) {
            String val = translationHintsFile.getStringValue(xpath);
            if (val != null && val.contains("translation hint")) {
                String hint = getHint(val);
                if (hint == null) {
                    System.out.println("DID NOT RECOGNIZE HINT: " + val);
                } else {
                    xpathToHint.put(xpath, hint);
                    ++count;
                    System.out.println("Found hint " + count + ": " + hint);
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
}
