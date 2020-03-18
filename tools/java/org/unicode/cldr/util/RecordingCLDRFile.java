package org.unicode.cldr.util;

import java.util.HashSet;
import java.util.Map;

/**
 * Like CLDRFile, with an added feature for recording the paths for which
 * getStringValue, etc., are called.
 *
 * The first intended usage is for ExampleGenerator, to identify all the paths on
 * which a given example depends. When beginning to generate an example, ExampleGenerator
 * can call clearPaths; then when finishing that example, it can call getPaths to get
 * the set of all paths in this file that were accessed to generate the example.
 */
public class RecordingCLDRFile extends CLDRFile {
    HashSet<String> paths = new HashSet<String>();

    public RecordingCLDRFile(XMLSource dataSource) {
        super(dataSource);

        /*
         * TODO: possibly freeze()?
         * Otherwise, possibly log when changes are made, since we anticipate
         * only read-access while recording; could override functions like add()...
         */
        // freeze(); // ?
    }

    public RecordingCLDRFile(XMLSource dataSource, XMLSource... resolvingParents) {
        super(dataSource, resolvingParents);
        // freeze(); // ?
    }

    public void clearPaths() {
        paths.clear();
    }

    public HashSet<String> getPaths() {
        return paths;
    }

    public String getStringValue(String xpath) {
        String result = super.getStringValue(xpath);
        paths.add(xpath);
        return result;
    }

    public String getWinningValue(String xpath) {
        String result = super.getWinningValue(xpath);
        paths.add(xpath);
        return result;
    }

    public String getConstructedValue(String xpath) {
        String result = super.getConstructedValue(xpath);
        paths.add(xpath);
        return result;
    }

    @SuppressWarnings({ "rawtypes", "unchecked" })
    private static Map asMap(String[][] data, boolean tree) {
        throw new UnsupportedOperationException("asMap is unsupported for RecordingCLDRFile");
    }
}
