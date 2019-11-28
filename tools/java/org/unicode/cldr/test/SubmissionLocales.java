package org.unicode.cldr.test;

import java.util.Set;
import java.util.regex.Pattern;

import org.unicode.cldr.util.Organization;
import org.unicode.cldr.util.StandardCodes;

import com.google.common.collect.ImmutableSet;

public final class SubmissionLocales {
    /**
     * NEW_CLDR_LOCALES is a set of locales that are sufficiently "new" that
     * submissions will be allowed for ALL paths in these locales, even during limited submission.
     * They may be (for v37):
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
     * set of paths, even during limited submission.
     *
     * TODO: Is this HIGH_LEVEL_LOCALES correct for v37 or not? Leaving unchanged for now.
     *
     * chr = Cherokee (United States)
     * gd = Scottish Gaelic (United Kingdom)
     * fo = Faroese (Faroe Islands)
     */
    private static Set<String> HIGH_LEVEL_LOCALES = ImmutableSet.of("chr", "gd", "fo");

    /**
     * CLDR_LOCALES will be the union of HIGH_LEVEL_LOCALES and all the locales for Organization.cldr (per Locales.txt).
     *
     * Use lazy evaluation for CLDR_LOCALES to avoid calling CLDRConfig too soon, and also to avoid evaluation
     * at all if LIMITED_SUBMISSION is false (in which case allowEvenIfLimited won't be called).
     */
    private static Set<String> CLDR_LOCALES = null;

    /**
     * Submission is allowed for paths matching this pattern, even during limited submission.
     * TODO: update for v37.
     * Reference: https://unicode-org.atlassian.net/browse/CLDR-13386
     */
    private static final Pattern ALLOWED_IN_LIMITED_PATHS = Pattern.compile(
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
     * Should submission be allowed for the given locale, path, and status (error/missing)?
     *
     * Only call this if CheckCLDR.LIMITED_SUBMISSION.
     *
     * @param localeString the given locale
     * @param path the given path
     * @param isError does the current winning value have an error?
     * @param missingInLastRelease was it missing in the last release?
     * @return true to allow, or false to disallow
     */
    public static boolean allowEvenIfLimited(String localeString, String path, boolean isError, boolean missingInLastRelease) {
        if (!CheckCLDR.LIMITED_SUBMISSION) {
            throw new IllegalArgumentException("allowEvenIfLimited called when !LIMITED_SUBMISSION");
        }

        /*
         * Don't limit paths that have errors, or any paths for "new" locales. 
         */
        if (isError || SubmissionLocales.NEW_CLDR_LOCALES.contains(localeString)) {
            return true; // allow
        }

        /*
         * Otherwise, lock all but CLDR locales.
         */
        if (CLDR_LOCALES == null) {
            /*
             * CLDR_LOCALES need not include NEW_CLDR_LOCALES, since we will already have
             * returned true if NEW_CLDR_LOCALES.contains(localeString).
             */
            CLDR_LOCALES = ImmutableSet.<String>builder()
                .addAll(HIGH_LEVEL_LOCALES)
                .addAll(StandardCodes.make().getLocaleToLevel(Organization.cldr).keySet()).build();
        }
        if (!CLDR_LOCALES.contains(localeString)) {
            return false; // disallow
        }

        /*
         * localeString is in CLDR_LOCALES, but not in NEW_CLDR_LOCALES.
         * Lock all paths except missingInLastRelease and pathAllowedInLimitedSubmission.
         */
        if (missingInLastRelease || pathAllowedInLimitedSubmission(path)) {
            return true; // allow
        }
        return false; // disallow
    }

    /**
     * Is submission for the given path allowed during limited submission?
     *
     * Only call this if CheckCLDR.LIMITED_SUBMISSION.
     *
     * @param path the given path
     * @return true to allow, false to disallow
     */
    public static boolean pathAllowedInLimitedSubmission(String path) {
        if (!CheckCLDR.LIMITED_SUBMISSION) {
            throw new IllegalArgumentException("pathAllowedInLimitedSubmission called when !LIMITED_SUBMISSION");
        }
        return ALLOWED_IN_LIMITED_PATHS.matcher(path).lookingAt();
    }
}
