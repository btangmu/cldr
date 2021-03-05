<template>
  <label for="loc">Base Locale: </label>
  <input id="loc" name="loc" v-model="baseLocale" />
  <hr />
  <table>
    <tbody>
      <tr>
        <td class="whatis_cell">
          What is...
          <input id="whatis" v-model="whatis" v-on:change="lookup_whatis()" />
        </td>
        <td>
          <b>xpath calculator - </b><br />
          <label for="xpath">XPath: </label
          ><input
            id="xpath"
            v-model="xpath"
            v-on:change="lookup_xpath('xpath')"
            size="160"
          />
          <br />
          <label for="hex">XPath hex id: </label
          ><input
            id="hex"
            v-model="hex"
            v-on:change="lookup_xpath('hex')"
            size="32"
          />
          <label for="dec">XPath decimal id: </label
          ><input
            id="dec"
            v-model="dec"
            v-on:change="lookup_xpath('dec')"
            size="8"
          />
          <div id="xpath_answer">
            {{ xpathAnswer }}
          </div>
        </td>
      </tr>
    </tbody>
  </table>
  <div id="whatis_answer">{{ whatisAnswer }}</div>
  <hr />
  <div class="helpHtml">
    <h4>Instructions:</h4>
    <p>
      <b>What Is...</b>: Enter a code or a portion of a name in the "What Is"
      field, such as "jgo" or "English", and press the Tab key. A list of
      matching codes will be shown.
    </p>
    <p>
      <b>XPath Calculator</b>: Enter an XPath, such as
      <kbd>//ldml/localeDisplayNames/localeDisplayPattern/localeSeparator</kbd>
      into the XPath field, and press the Tab key. Or, enter an XPath strid,
      such as <kbd>1d142c4be7841aa7</kbd> into the XPath strid field and press
      the Tab key. The other fields (if applicable) will be filled in.
    </p>
  </div>
</template>

<script>
import * as cldrAjax from "../../../src/main/webapp/js/esm/cldrAjax.js";

export default {
  data() {
    return {
      baseLocale: "en_US",
      whatis: "",
      whatisAnswer: "",
      xpath: "",
      hex: "",
      dec: "",
      xpathAnswer: "To begin, enter a value and press the tab key",
    };
  },

  methods: {
    /**
     * Look up the entered string
     */
    lookup_whatis() {
      if (!this.whatis) {
        this.whatisAnswer = "";
        return;
      }
      this.whatisAnswer = "Looking up " + this.whatis + "...";
      cldrAjax.sendXhr({
        url:
          "/cldr-apps/browse_results.jsp?loc=" +
          this.baseLocale +
          "&q=" +
          this.whatis,
        load: function (h) {
          this.whatisAnswer = h;
        },
        error: function (err) {
          this.whatisAnswer = "Error: " + err;
        },
      });
    },

    /**
     * Look up the entered xpath string, hex code, or decimal code
     *
     * @param from - "xpath", "hex" or "dec"
     */
    lookup_xpath(from) {
      console.log("lookup_xpath, this.baseLocale = " + this.baseLocale);
      console.log("lookup_xpath, this.xpath = " + this.xpath);
      console.log("lookup_xpath, this.hex = " + this.hex);
      console.log("lookup_xpath, this.dec = " + this.dec);
      let v = "";
      if (from === "xpath") {
        v = this.xpath;
      } else if (from === "hex") {
        v = this.hex;
      } else if (from === "dec") {
        v = this.dec;
      } else {
        console.log("lookup_xpath, invalid from = " + from);
      }
      if (v.length == 0) {
        return;
      }
      this.xpathAnswer = "Looking up " + from + " " + v + "...";
      const xhrArgs = {
        url: "api/xpath/" + from + "/" + v,
        handleAs: "json",
        load: this.loadHandler,
        error: this.errorHandler,
      };
      cldrAjax.sendXhr(xhrArgs);
    },

    loadHandler(json) {
      if (json.err) {
        this.xpathAnswer = json.message;
      } else {
        this.xpath = json.xpath;
        this.hex = json.hexId;
        this.dec = json.decimalId;
        this.xpathAnswer = "OK";
      }
    },

    errorHandler(err) {
      this.xpathAnswer = "Error: " + err;
    },
  },
  computed: {
    console: () => console,
  },
};
</script>

<style scoped>
.whatis_cell {
  border-right: 4px solid gray;
}
#whatis {
  font-size: x-large;
}
#xpath_answer {
  font-style: italic;
}
#whatis_answer {
  font-style: italic;
}
.helpHtml {
  margin: 2em;
}
</style>
