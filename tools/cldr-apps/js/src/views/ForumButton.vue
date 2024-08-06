<template>
  <section>
    <button
      v-if="!forumForm && !success"
      title="Make a forum post"
      @click="getForm"
    >
      +
    </button>
    <div v-if="forumForm && forumForm.length">
      <label for="formData">alt=</label>
      <select
        id="formData"
        name="formData"
        v-model="formData"
        title="Choose an alt attribute"
      >
        <option disabled value="">Please Select</option>
        <option :key="alt" v-for="alt in forumForm">{{ alt }}</option>
      </select>
    </div>
    <div>
      <span v-if="formData">
        <button title="Add alt path now" @click="reallyAdd">Add</button>
        &nbsp;
      </span>
      <span v-if="formData || errMessage">
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
import * as cldrForum from "../esm/cldrForum.mjs";

export default {
  data() {
    return {
      post: null,
      postType: null,
      label: null,
      forumForm: null,
      formData: "",
      errMessage: null,
      success: false,
    };
  },

  methods: {
    setPostData(post, postType, label) {
      this.post = post;
      this.postType = postType;
      this.label = label;
    },

    getForm() {
      if (this.success) {
        // cldrAddAlt.getAlts(this.xpstrid, this.setAlts /* callback */);
      }
    },

    // callback
    // setAlts(json) {
    //  this.forumForm = json.alt;
    // },

    /*
    reallyAdd() {
      if (this.xpstrid && this.formData) {
        cldrForum.addformData(
          this.xpstrid,
          this.formData,
          this.showResult
        );
      }
    },
*/

    showResult(errMessage) {
      this.reset();
      this.errMessage = errMessage; // null or empty for success
      if (!errMessage) {
        this.success = true;
      }
    },

    clickLoad() {
      this.reset();
      cldrAddAlt.reloadPage();
    },

    reset() {
      this.forumForm = null;
      this.formData = "";
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
