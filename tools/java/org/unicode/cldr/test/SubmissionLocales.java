package org.unicode.cldr.test;

import java.util.Set;
import java.util.regex.Pattern;

import org.unicode.cldr.util.Organization;
import org.unicode.cldr.util.StandardCodes;

import com.google.common.collect.ImmutableSet;

public final class SubmissionLocales {
    /**
     * NEW_CLDR_LOCALES is a set of locales that are sufficiently "new" that
     * submissions will be allowed for ALL paths in these locales. They may be (for v37):
     * (1) completely new to CLDR ("pcm" and "mai");
     * (2) new for Basic coverage level ("kok", "mni", "sat", "snd", "su"); or
     * (3) otherwise sufficiently new ("ceb").
     *
     * ceb = Cebuano
     * kok = Konkani
     * mai = Maithili
     * mni = Manipuri
     * pcm = Nigerian Pidgin
     * sat = Santali
     * snd = Sindhi
     * su = Sundanese
     *
     * Reference: https://unicode-org.atlassian.net/browse/CLDR-13386
     */
    private static Set<String> NEW_CLDR_LOCALES = ImmutableSet.of ("ceb", "kok", "mai", "mni", "pcm", "sat", "snd", "su");

    /**
     * HIGH_LEVEL_LOCALES is a set of locales for which submission will be allowed for a limited
     * set of paths.
     *
     * TODO: Is this HIGH_LEVEL_LOCALES correct for v37 or not? Leaving unchanged for now.
     *
     * chr = Cherokee (United States)
     * gd = Scottish Gaelic (United Kingdom)
     * fo = Faroese (Faroe Islands)
     */
    private static Set<String> HIGH_LEVEL_LOCALES = ImmutableSet.of("chr", "gd", "fo");

    /**
     * CLDR_LOCALES is the union of NEW_CLDR_LOCALES, HIGH_LEVEL_LOCALES,
     * and all the locales for Organization.cldr (per Locales.txt).
     *
     * NOTE: there's currently no real need for CLDR_LOCALES to include NEW_CLDR_LOCALES,
     * since these sets are only accessed by allowEvenIfLimited, which returns true
     * immediately for locales in NEW_CLDR_LOCALES.
     */
    private static Set<String> CLDR_LOCALES = ImmutableSet.<String>builder()
        .addAll(HIGH_LEVEL_LOCALES)
        .addAll(NEW_CLDR_LOCALES)
        .addAll(StandardCodes.make().getLocaleToLevel(Organization.cldr).keySet()).build();

    // have to have a lazy eval because otherwise CLDRConfig is called too early in the boot process
    /*
     * TODO: clarify the above comment about "lazy eval", and the commented-out code below
     * starting with synchronized (SUBMISSION).
     *
     * Evidently lazy eval was used before this commit on Nov 26, 2018, in which the code was
     * moved here from CheckCLDR.java:
     *
     * https://github.com/unicode-org/cldr/commit/91ab858aa15ace00d09012b5bf45474cb071b7bd#diff-cf05ad8eb22d4a7b053ac1cb38e433cb
     *
     * The commented-out code below starting with synchronized (SUBMISSION) was lazy eval.
     * The current code is NOT lazy eval. Should it be? Maybe it wouldn't hurt, just in case.
     * The set, if null, could be built inside allowEvenIfLimited.
     */
//            synchronized (SUBMISSION) {
//                if (CLDR_LOCALES == null) {
//                    CLDR_LOCALES = ImmutableSet.<String>builder()
//                        .addAll(HIGH_LEVEL_LOCALES)
//                        .addAll(StandardCodes.make().getLocaleToLevel(Organization.cldr).keySet()).build();
//                }
//            }

    public static final Pattern ALLOWED_IN_LIMITED_PATHS = Pattern.compile(
        "//ldml/"
            + "(listPatterns/listPattern\\[@type=\"standard"
            + "|annotations/annotation\\[@cp=\"([©®‼⁉☑✅✔✖✨✳✴❇❌❎❓-❕❗❣ ➕-➗👫-👭👱🥰🧩🧔😸😺😹😼😻🦊😽😼⭕😺😿😾😻😸😹🐺⭕🦄😽🐼🐸😿🤖🐹🐻🙀🦁]|👱‍♀|👱‍♂)\""
            + "|localeDisplayNames/"
            +   "(scripts/script\\[@type=\"(Elym|Hmnp|Nand|Wcho)\""
            +    "|territories/territory\\[@type=\"(MO|SZ)\"](\\[@alt=\"variant\"])?"
            +    "|types/type\\[@key=\"numbers\"]\\[@type=\"(hmnp|wcho)\"]"
            +   ")"
            + "|dates/timeZoneNames/(metazone\\[@type=\"Macau\"]"
            +   "|zone\\[@type=\"Asia/Macau\"]"
            +   ")"
            + ")"
            );
    
//ldml/dates/timeZoneNames/metazone[@type="Macau"]/long/daylight, old: Macau Summer Time, new: Macao Summer Time
//ldml/dates/timeZoneNames/metazone[@type="Macau"]/long/standard, old: Macau Standard Time, new: Macao Standard Time
//ldml/localeDisplayNames/territories/territory[@type="SZ"][@alt="variant"], old: SZ, new: Swaziland
//ldml/dates/timeZoneNames/zone[@type="Asia/Macau"]/exemplarCity, old: Macau, new: Macao
//ldml/dates/timeZoneNames/metazone[@type="Macau"]/long/generic, old: Macau Time, new: Macao Time
//ldml/localeDisplayNames/territories/territory[@type="SZ"], old: Swaziland, new: Eswatini


    /**
     * Only call this if LIMITED_SUBMISSION
     * @param localeString
     * @param path
     * @param isError
     * @param missingInLastRelease
     * @return
     */
    public static boolean allowEvenIfLimited(String localeString, String path, boolean isError, boolean missingInLastRelease) {

        // don't limit new locales or errors

        if (SubmissionLocales.NEW_CLDR_LOCALES.contains(localeString) || isError) {
            return true; 
        } else {
            int debug = 0; // for debugging
        }

        // all but CLDR locales are otherwise locked

        if (!SubmissionLocales.CLDR_LOCALES.contains(localeString)) {
            return false;
        } else {
            int debug = 0; // for debugging
        }

        // in those locales, lock all paths except missing and special

        if (missingInLastRelease) {
            return true;
        } else {
            int debug = 0; // for debugging
        }

        if (pathAllowedInLimitedSubmission(path)) {
            return true;
        } else {
            int debug = 0; // for debugging
        }

        return false; // skip
    }

    public static boolean pathAllowedInLimitedSubmission(String path) {
        return SubmissionLocales.ALLOWED_IN_LIMITED_PATHS.matcher(path).lookingAt();
    }
}