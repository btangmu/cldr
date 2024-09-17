<template>
  <section>
    <button
      v-if="!valueForm && !success"
      title="Add a value"
      @click="getMenu"
    >
      +value
    </button>
    <div v-if="valueForm && valueForm.length">
      <label for="chosenAlt">alt=</label>
      <select
        id="chosenAlt"
        name="chosenAlt"
        v-model="chosenAlt"
        title="Choose an alt attribute"
      >
        <option disabled value="">Please Select</option>
        <option :key="alt" v-for="alt in valueForm">{{ alt }}</option>
      </select>
    </div>
    <div>
      <span v-if="chosenAlt">
        <button title="Add alt path now" @click="reallyAdd">Add</button>
        &nbsp;
      </span>
      <span v-if="chosenAlt || errMessage">
        <button title="Do not add alt path" @click="reset">Cancel</button>
      </span>
    </div>
    <div v-if="errMessage">
      {{ errMessage }}
    </div>
    <div v-if="success">
      “alt” added.
      <button @click="clickLoad">Reload Page</button>
    </div>
  </section>
</template>

<script>
import * as cldrAddValue from "../esm/cldrAddValue.mjs";

export default {
  data() {
    return {
      xpstrid: null,
      valueForm: null,
      chosenAlt: "",
      errMessage: null,
      success: false,
    };
  },

  methods: {
    setXpathStringId(xpstrid) {
      this.xpstrid = xpstrid;
    },

    getMenu() {
      if (this.xpstrid) {
        cldrAddValue.getAlts(this.xpstrid, this.setAlts /* callback */);
      }
    },

    // callback
    setAlts(json) {
      this.valueForm = json.alt;
    },

    reallyAdd() {
      if (this.xpstrid && this.chosenAlt) {
        cldrAddValue.addChosenValue(
          this.xpstrid,
          this.chosenAlt,
          this.showResult /* callback */
        );
      }
    },

    showResult(errMessage) {
      this.reset();
      this.errMessage = errMessage; // null or empty for success
      if (!errMessage) {
        this.success = true;
      }
    },

    clickLoad() {
      this.reset();
      cldrAddValue.reloadPage();
    },

    reset() {
      this.valueForm = null;
      this.chosenAlt = "";
      this.errMessage = null;
      this.success = false;
    },
  },
};
</script>

<style scoped>
button,
select {
  margin-top: 1ex;
}

section {
  clear: both;
  float: right;
}
</style>
