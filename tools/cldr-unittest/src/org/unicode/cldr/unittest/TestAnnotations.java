package org.unicode.cldr.unittest;

import java.io.File;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Pattern;

import org.unicode.cldr.util.Annotations;
import org.unicode.cldr.util.Annotations.AnnotationSet;
import org.unicode.cldr.util.CLDRConfig;
import org.unicode.cldr.util.CLDRFile;
import org.unicode.cldr.util.CLDRPaths;
import org.unicode.cldr.util.CldrUtility;
import org.unicode.cldr.util.Emoji;
import org.unicode.cldr.util.Factory;
import org.unicode.cldr.util.PathHeader.PageId;
import org.unicode.cldr.util.SimpleFactory;
import org.unicode.cldr.util.XListFormatter;
import org.unicode.cldr.util.XListFormatter.ListTypeLength;

import com.google.common.base.CharMatcher;
import com.google.common.base.Splitter;
import com.google.common.collect.ImmutableSet;
import com.google.common.collect.ImmutableSortedSet;
import com.google.common.collect.Multimap;
import com.google.common.collect.TreeMultimap;
import com.ibm.icu.dev.util.CollectionUtilities;
import com.ibm.icu.dev.util.UnicodeMap;
import com.ibm.icu.impl.Row;
import com.ibm.icu.impl.Row.R3;
import com.ibm.icu.impl.Row.R4;
import com.ibm.icu.impl.Utility;
import com.ibm.icu.text.Collator;
import com.ibm.icu.text.UnicodeSet;

public class TestAnnotations extends TestFmwkPlus {
    private static final boolean DEBUG = false;

    public static void main(String[] args) {
        new TestAnnotations().run(args);
    }

    enum Containment {
        contains, empty, not_contains
    }

    public void TestBasic() {
        String[][] tests = {
            { "en", "[\u2650]", "contains", "sagitarius", "zodiac" },
            { "en", "[\u0020]", "empty" },
            { "en", "[\u2651]", "not_contains", "foobar" },
        };
        for (String[] test : tests) {
            UnicodeMap<Annotations> data = Annotations.getData(test[0]);
            UnicodeSet us = new UnicodeSet(test[1]);
            Set<String> annotations = new LinkedHashSet<>();
            Containment contains = Containment.valueOf(test[2]);
            for (int i = 3; i < test.length; ++i) {
                annotations.add(test[i]);
            }
            for (String s : us) {
                Set<String> set = data.get(s).getKeywords();
                if (set == null) {
                    set = Collections.emptySet();
                }
                switch (contains) {
                case contains:
                    if (Collections.disjoint(set, annotations)) {
                        LinkedHashSet<String> temp = new LinkedHashSet<>(annotations);
                        temp.removeAll(set);
                        assertEquals("Missing items", Collections.EMPTY_SET, temp);
                    }
                    break;
                case not_contains:
                    if (!Collections.disjoint(set, annotations)) {
                        LinkedHashSet<String> temp = new LinkedHashSet<>(annotations);
                        temp.retainAll(set);
                        assertEquals("Extra items", Collections.EMPTY_SET, temp);
                    }
                    break;
                case empty:
                    assertEquals("mismatch", Collections.emptySet(), set);
                    break;
                }
            }
        }
    }

    final AnnotationSet eng = Annotations.getDataSet("en");

    public void TestNames() {
        String[][] tests = { // the expected value for keywords can use , as well as |.
            {"👨🏻", "man: light skin tone", "adult | man | light skin tone"},
            {"👱‍♂️", "man: blond hair", "blond, blond-haired man, hair, man, man: blond hair"},
            {"👱🏻‍♂️", "man: light skin tone, blond hair", "blond, blond-haired man, hair, man, man: blond hair, light skin tone, blond hair"},
            {"👨‍🦰", "man: red hair", "adult | man | red hair"},
            { "👨🏻‍🦰", "man: light skin tone, red hair", "adult | man | light skin tone| red hair"},
            { "🇪🇺", "flag: European Union", "flag" },
            { "#️⃣", "keycap: #", "keycap" },
            { "9️⃣", "keycap: 9", "keycap" },
            { "💏", "kiss", "couple | kiss" },
            { "👩‍❤️‍💋‍👩", "kiss: woman, woman", "couple | kiss | woman" },
            { "💑", "couple with heart", "couple | couple with heart | love" },
            { "👩‍❤️‍👩", "couple with heart: woman, woman", "couple | couple with heart | love | woman" },
            { "👪", "family", "family" },
            { "👩‍👩‍👧", "family: woman, woman, girl", "family | woman | girl" },
            { "👦🏻", "boy: light skin tone", "boy | young | light skin tone" },
            { "👩🏿", "woman: dark skin tone", "adult | woman | dark skin tone" },
            { "👨‍⚖", "man judge", "justice | man | man judge | scales" },
            { "👨🏿‍⚖", "man judge: dark skin tone", "justice | man | man judge | scales | dark skin tone" },
            { "👩‍⚖", "woman judge", "judge | scales | woman" },
            { "👩🏼‍⚖", "woman judge: medium-light skin tone", "judge | scales | woman | medium-light skin tone" },
            { "👮", "police officer", "cop | officer | police" },
            { "👮🏿", "police officer: dark skin tone", "cop | officer | police | dark skin tone" },
            { "👮‍♂️", "man police officer", "cop | man | officer | police" },
            { "👮🏼‍♂️", "man police officer: medium-light skin tone", "cop | man | officer | police | medium-light skin tone" },
            { "👮‍♀️", "woman police officer", "cop | officer | police | woman" },
            { "👮🏿‍♀️", "woman police officer: dark skin tone", "cop | officer | police | woman | dark skin tone" },
            { "🚴", "person biking", "bicycle | biking | cyclist | person biking" },
            { "🚴🏿", "person biking: dark skin tone", "bicycle | biking | cyclist | person biking | dark skin tone" },
            { "🚴‍♂️", "man biking", "bicycle | biking | cyclist | man" },
            { "🚴🏿‍♂️", "man biking: dark skin tone", "bicycle | biking | cyclist | man | dark skin tone" },
            { "🚴‍♀️", "woman biking", "bicycle | biking | cyclist | woman" },
            { "🚴🏿‍♀️", "woman biking: dark skin tone", "bicycle | biking | cyclist | woman | dark skin tone" },
        };

        Splitter BAR = Splitter.on(CharMatcher.anyOf("|,")).trimResults();
        boolean ok = true;
        for (String[] test : tests) {
            String emoji = test[0];
            String expectedName = test[1];
            Set<String> expectedKeywords = new HashSet<>(BAR.splitToList(test[2]));
            final String shortName = eng.getShortName(emoji);
            final Set<String> keywords = eng.getKeywords(emoji);
            ok &= assertEquals("short name for " + emoji, expectedName, shortName);
            ok &= assertEquals("keywords for " + emoji, expectedKeywords, keywords);
        }
        if (!ok) {
            System.out.println("Possible replacement, but check");
            for (String[] test : tests) {
                String emoji = test[0];
                final String shortName = eng.getShortName(emoji);
                final Set<String> keywords = eng.getKeywords(emoji);
                System.out.println("{\"" + emoji
                    + "\",\"" + shortName
                    + "\",\"" + CollectionUtilities.join(keywords, " | ")
                    + "\"},");
            }
        }

    }
    static final UnicodeSet symbols = new UnicodeSet(Emoji.EXTRA_SYMBOL_MINOR_CATEGORIES.keySet())
        .freeze();
    /** The English name should line up with the emoji-test.txt file */
    public void TestNamesVsEmojiData() {
        for (Entry<String, Annotations> s : eng.getExplicitValues().entrySet()) {
            String emoji = s.getKey();
            Annotations annotations = s.getValue();
            String name = Emoji.getName(emoji);
            String annotationName = annotations.getShortName();
            if (!symbols.contains(emoji) && !emoji.contains("👲")) {
                assertEquals(emoji, name, annotationName);
            }
        }
    }
    
    public void TestCategories() {
        if (DEBUG) System.out.println();

        TreeSet<R4<PageId, Long, String, R3<String, String, String>>> sorted = new TreeSet<>();
        for (Entry<String, Annotations> s : eng.getExplicitValues().entrySet()) {
            String emoji = s.getKey();
            Annotations annotations = s.getValue();
            final String rawCategory = Emoji.getMajorCategory(emoji);
            PageId majorCategory = PageId.forString(rawCategory);
            if (majorCategory == PageId.Symbols) {
                majorCategory = PageId.Symbols2;
            }
            String minorCategory = Emoji.getMinorCategory(emoji);
            long emojiOrder = Emoji.getEmojiToOrder(emoji);
            R3<String, String, String> row2 = Row.of(emoji, annotations.getShortName(), CollectionUtilities.join(annotations.getKeywords(), " | "));
            R4<PageId, Long, String, R3<String, String, String>> row = Row.of(majorCategory, emojiOrder, minorCategory, row2);
            sorted.add(row);
        }
        for (R4<PageId, Long, String, R3<String, String, String>> row : sorted) {
            PageId majorCategory = row.get0();
            Long emojiOrder = row.get1();
            String minorCategory = row.get2();
            R3<String, String, String> row2 = row.get3();
            String emoji = row2.get0();
            String shortName = row2.get1();
            String keywords = row2.get2();
            if (DEBUG) System.out.println(majorCategory 
                + "\t" + emojiOrder
                + "\t" + minorCategory
                + "\t" + emoji
                + "\t" + shortName
                + "\t" + keywords
                );
        }
    }

    private class UniquenessInfo {
        UnicodeMap<Annotations> english = Annotations.getData("en");
        UnicodeSet englishKeys = getCurrent(english.keySet());
    }

    public void TestUniqueness() {
        Set<String> locales = new TreeSet<>();
        locales.add("en");
        locales.addAll(Annotations.getAvailable());
        locales.remove("root");
        UniquenessInfo uniquenessInfo = new UniquenessInfo();
        locales.parallelStream().forEach(locale -> uniquenessThisLocale(uniquenessInfo, locale));
    }

    private void uniquenessThisLocale(UniquenessInfo uniquenessInfo, String locale) {
        logln("uniqueness: " + locale);
        Multimap<String, String> verboseNameToEmoji = TreeMultimap.create();
        Multimap<String, String> nameToEmoji = TreeMultimap.create();
        Map<String, UnicodeSet> localeToMissing = new TreeMap<>();
        AnnotationSet data = Annotations.getDataSet(locale);
        nameToEmoji.clear();
        localeToMissing.put(locale, new UnicodeSet(uniquenessInfo.englishKeys).removeAll(data.keySet()).freeze());
        for (String emoji : Emoji.getAllRgi()) {
            String name = data.getShortName(emoji);
            if (name == null) {
                continue;
            }
            if (name.contains(CldrUtility.INHERITANCE_MARKER)) {
                throw new IllegalArgumentException(CldrUtility.INHERITANCE_MARKER + " in name of " + emoji + " in " + locale);
            }
            nameToEmoji.put(name, emoji);
        }
        for (Entry<String, Collection<String>> entry : nameToEmoji.asMap().entrySet()) {
            String name = entry.getKey();
            Collection<String> emojis = entry.getValue();
            if (emojis.size() > 1) {
                errln("Duplicate name in " + locale + ": “" + name + "” for "
                    + CollectionUtilities.join(emojis, " & "));
                verboseNameToEmoji.putAll(name, emojis);
            }
        }
        if (isVerbose() && !verboseNameToEmoji.isEmpty()) {
            System.out.println("\nCollisions");
            for (Entry<String, String> entry : verboseNameToEmoji.entries()) {
                String emoji = entry.getValue();
                System.out.println(locale
                    + "\t" + eng.getShortName(emoji)
                    + "\t" + emoji);
            }
        }
    }

    private UnicodeSet getCurrent(UnicodeSet keySet) {
        UnicodeSet currentAge = new UnicodeSet("[:age=9.0:]");
        UnicodeSet result = new UnicodeSet();
        for (String s : keySet) {
            if (currentAge.containsAll(s)) {
                result.add(s);
            }
        }
        return result.freeze();
    }

    public void testAnnotationPaths() {
        assertTrue("", Emoji.getNonConstructed().contains("®"));
        Factory factoryAnnotations = SimpleFactory.make(CLDRPaths.ANNOTATIONS_DIRECTORY, ".*");
        for (String locale : Arrays.asList("en", "root")) {
            CLDRFile enAnnotations = factoryAnnotations.make(locale, false);
            //               //ldml/annotations/annotation[@cp="🧜"][@type="tts"]
            Set<String> annotationPaths = enAnnotations.getPaths("//ldml/anno",
                Pattern.compile("//ldml/annotations/annotation.*tts.*").matcher(""),
                new TreeSet<>());
            Set<String> annotationPathsExpected = Emoji.getNamePaths();
            checkAMinusBIsC("(" + locale + ".xml - Emoji.getNamePaths)", annotationPaths, annotationPathsExpected, Collections.<String> emptySet());
            checkAMinusBIsC("(Emoji.getNamePaths - " + locale + ".xml)", annotationPathsExpected, annotationPaths, Collections.<String> emptySet());
        }
    }
    public void testEmojiImages() {
        Factory factoryAnnotations = SimpleFactory.make(CLDRPaths.ANNOTATIONS_DIRECTORY, ".*");
        CLDRFile enAnnotations = factoryAnnotations.make("en", false);

        String emojiImageDir = CLDRPaths.BASE_DIRECTORY + "/tools/cldr-apps/WebContent/images/emoji";
        for (String emoji : Emoji.getNonConstructed()) { 
            String noVs = emoji.replace(Emoji.EMOJI_VARIANT, "");

            // example: emoji_1f1e7_1f1ec.png
            String fileName = "emoji_" + Utility.hex(noVs, 4, "_").toLowerCase(Locale.ENGLISH) + ".png";
            File file = new File(emojiImageDir, fileName);

            if (!file.exists()) {
                String name = enAnnotations.getStringValue("//ldml/annotations/annotation[@cp=\"" + noVs + "\"][@type=\"tts\"]");
                errln(fileName + " missing; " + name);
            }
        }
    }

    /**
     * Check that the order info, categories, and collation are consistent.
     */
    public void testEmojiOrdering() {
        // load an array for sorting
        // and test that every order value maps to exactly one emoji
        Map<String,String> minorToMajor = new HashMap<>();
        Map<Long, String> orderToEmoji = new TreeMap<>();
        Collator col = CLDRConfig.getInstance().getCollatorRoot();

        for (String emoji : Emoji.getNonConstructed()) {
            Long emojiOrder = Emoji.getEmojiToOrder(emoji);
            if (DEBUG) {
                String minor = Emoji.getMinorCategory(emoji);
                System.out.println(emojiOrder + "\t" + emoji + "\t" + minor);
            }
            String oldEmoji = orderToEmoji.get(emojiOrder);
            if (oldEmoji == null) {
                orderToEmoji.put(emojiOrder, emoji);
            } else {
                errln("single order value with different emoji" + emoji + " ≠ " + oldEmoji);
            }
        }
        Set<String> majorsSoFar = new TreeSet<>();
        String lastMajor = "";
        Set<String> minorsSoFar = new TreeSet<>();
        String lastMinor = "";
        Set<String> lastMajorGroup = new LinkedHashSet<>();
        Set<String> lastMinorGroup = new LinkedHashSet<>();
        String lastEmoji = "";
        long lastEmojiOrdering = -1L;
        for (Entry<Long, String> entry : orderToEmoji.entrySet()) {
            String emoji = entry.getValue();
            Long emojiOrdering = entry.getKey();
            // check against collation
            if (col.compare(emoji, lastEmoji) <= 0) {
                String name = eng.getShortName(emoji);
                String lastName = eng.getShortName(lastEmoji);
                int errorType = ERR;
                if (logKnownIssue("cldr13660", "slightly out of order")) {
                    errorType = WARN;
                };
                msg("Out of order: " 
                + lastEmoji + " (" + lastEmojiOrdering + ") " + lastName
                + " > " 
                + emoji + " (" + emojiOrdering + ") " + name, errorType, true, true);
            }

            String major = Emoji.getMajorCategory(emoji);
            String minor = Emoji.getMinorCategory(emoji);
            if (isVerbose()) {
                System.out.println(major + "\t" + minor + "\t" + emoji);
            }
            String oldMajor = minorToMajor.get(minor);
            // never get major1:minor1 and major2:minor1
            if (oldMajor == null) {
                minorToMajor.put(minor, major); 
            } else {
                assertEquals(minor + " maps to different majors for " + Utility.hex(emoji), oldMajor, major);
            }
            // never get major1 < major2 < major1
            if (!major.equals(lastMajor)) {
                //System.out.println(lastMajor + "\t" + lastMajorGroup);

//                if (majorsSoFar.contains(major)) {
//                    errln("Non-contiguous majors: " + major + " <… " + lastMajor + " < " + major);
//                }
                majorsSoFar.add(major);
                lastMajor = major;
                lastMajorGroup.clear();
                lastMajorGroup.add(emoji); // add emoji with different cat
            } else {
                lastMajorGroup.add(emoji);
            }
            // never get minor1 < minor2 < minor1
            if (!minor.equals(lastMinor)) {
                if (DEBUG) System.out.println(lastMinor + "\t" + lastMinorGroup);
                if (minorsSoFar.contains(minor)) {
                    errln("Non-contiguous minors: " + minor + " <… " + lastMinor + " < " + minor);
                }
                minorsSoFar.add(minor);
                lastMinor = minor;
                lastMinorGroup.clear();
                lastMinorGroup.add(emoji); // add emoji with different cat
            } else {
                lastMinorGroup.add(emoji);
            }
            lastEmoji = emoji;
            lastEmojiOrdering = emojiOrdering;
        }
        if (DEBUG) System.out.println(lastMinor + "\t" + lastMinorGroup);
    }


    public void testSuperfluousAnnotationPaths() {
        Factory factoryAnnotations = SimpleFactory.make(CLDRPaths.ANNOTATIONS_DIRECTORY, ".*");
        ImmutableSet<String> rootPaths = ImmutableSortedSet.copyOf(factoryAnnotations.make("root", false).iterator("//ldml/annotations/"));

        CLDRFile englishAnnotations = factoryAnnotations.make("en", false);
        ImmutableSet<String> englishPaths = ImmutableSortedSet.copyOf(englishAnnotations.iterator("//ldml/annotations/"));

        Set<String> superfluous2 = setDifference(rootPaths, englishPaths);
        assertTrue("en contains root", superfluous2.isEmpty());
        if (!superfluous2.isEmpty()) {
            for (String path : superfluous2) {
//              XPathParts parts = XPathParts.getFrozenInstance(path);
//              String emoji = parts.getAttributeValue(-1, "cp");
                System.out.println("locale=en; action=add; path=" + path + "; value=XXX");
            }
        }

        Set<String> allSuperfluous = new TreeSet<>();
        for (String locale : factoryAnnotations.getAvailable()) {
            ImmutableSet<String> currentPaths = ImmutableSortedSet.copyOf(factoryAnnotations.make(locale, false).iterator("//ldml/annotations/"));
            Set<String> superfluous = setDifference(currentPaths, rootPaths);
            assertTrue("root contains " + locale, superfluous.isEmpty());
            allSuperfluous.addAll(superfluous);
            for (String s : currentPaths) {
                if (s.contains("\uFE0F")) {
                    errln("Contains FE0F: " + s);
                    break;
                }
            }
        }
        // get items to fix
        if (!allSuperfluous.isEmpty()) {
            for (String path : allSuperfluous) {
//                XPathParts parts = XPathParts.getFrozenInstance(path);
//                String emoji = parts.getAttributeValue(-1, "cp");
                System.out.println("locale=/.*/; action=delete; path=" + path);
            }
        }
    }

    private Set<String> setDifference(ImmutableSet<String> a, ImmutableSet<String> b) {
        Set<String> superfluous = new LinkedHashSet<>(a);
        superfluous.removeAll(b);
        return superfluous;
    }

    private void checkAMinusBIsC(String title, Set<String> a, Set<String> b, Set<String> c) {
        Set<String> aMb = new TreeSet<>(a);
        aMb.removeAll(b);
        for (Iterator<String> it = aMb.iterator(); it.hasNext();) {
            String item = it.next();
            if (symbols.containsSome(item)) {
                it.remove();
            }
        }
        assertEquals(title + " (" + aMb.size() + ")", c, aMb);
    }

    public void testListFormatter() {
        Object[][] tests = {
            {"en", ListTypeLength.NORMAL, "ABC", "A, B, and C"},
            {"en", ListTypeLength.AND_SHORT, "ABC", "A, B, & C"},
            {"en", ListTypeLength.AND_NARROW, "ABC", "A, B, C"},
            {"en", ListTypeLength.OR_WIDE, "ABC", "A, B, or C"}
        };
        Factory factory = CLDRConfig.getInstance().getCldrFactory();
        for (Object[] test : tests) {
            CLDRFile cldrFile = factory.make((String)(test[0]), true);
            ListTypeLength listTypeLength = (ListTypeLength)(test[1]);
            String expected = (String)test[3];
            XListFormatter xlistFormatter = new XListFormatter(cldrFile, listTypeLength);
            String source = (String)test[2];
            String actual = xlistFormatter.formatCodePoints(source);
            assertEquals(test[0] + ", " + listTypeLength + ", " + source, expected, actual);
        }
    }
}
