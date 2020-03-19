package org.unicode.cldr.util;

import java.util.HashSet;

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
    private HashSet<String> paths = new HashSet<String>();

    public RecordingCLDRFile(XMLSource dataSource) {
        super(dataSource);
    }

    public RecordingCLDRFile(XMLSource dataSource, XMLSource... resolvingParents) {
        super(dataSource, resolvingParents);
    }

    public void clearPaths() {
        paths.clear();
    }

    public HashSet<String> getPaths() {
        return paths;
    }

    public String getStringValue(String xpath) {
        addPath(xpath);
        return super.getStringValue(xpath);
    }

    public String getWinningValue(String xpath) {
        addPath(xpath);
        return super.getWinningValue(xpath);
    }

    public String getConstructedValue(String xpath) {
        addPath(xpath);
        return super.getConstructedValue(xpath);
    }

    private void addPath(String xpath) {
        paths.add(xpath);
    }
}
