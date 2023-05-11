<template>
  <header>Compose announcement</header>
  <a-form
    :model="formState"
    name="basic"
    autocomplete="off"
    @finish="onFinish"
    @finishFailed="onFinishFailed"
  >
    <a-form-item
      name="orgsAll"
      label="Organization(s)"
      class="formItems"
      v-if="formHasAllOrgs"
    >
      <a-radio-group
        v-model:value="formState.orgsMineOrAll"
        :change="changeOrg()"
      >
        <a-radio value="Mine">Mine</a-radio>
        <a-radio value="All">All</a-radio>
      </a-radio-group>
    </a-form-item>

    <a-form-item name="audience" label="Audience" class="formItems">
      <a-radio-group v-model:value="formState.audience">
        <a-radio value="Everyone">Everyone</a-radio>
        <a-radio value="Vetters">Vetters</a-radio>
        <a-radio value="Managers">Managers</a-radio>
        <a-radio value="TC">TC</a-radio>
      </a-radio-group>
    </a-form-item>

    <a-form-item class="formItems" label="Locales" name="locales">
      <a-input
        v-model:value="formState.locales"
        placeholder="Optional list of locales, for example: aa fr_CA zh"
      />
    </a-form-item>

    <a-form-item
      class="formItems"
      label="Subject"
      name="subject"
      :rules="[{ required: true, message: 'Please enter a subject!' }]"
    >
      <a-input v-model:value="formState.subject" />
    </a-form-item>
    <a-form-item
      class="formItems"
      label="Body"
      name="body"
      :rules="[{ required: true, message: 'Please enter a message body!' }]"
    >
      <a-textarea
        v-model:value="formState.body"
        placeholder="Enter message here...</br>Simple HTML mark-up is supported."
        :rows="4"
      />
    </a-form-item>

    <div class="buttons">
      <a-form-item>
        <a-button html-type="cancel" @click="onCancel">Cancel</a-button>
        &nbsp;
        <a-button type="primary" html-type="submit" @click="onPost"
          >Post</a-button
        >
      </a-form-item>
    </div>
  </a-form>
</template>

<script>
import { defineComponent, reactive } from "vue";

export default defineComponent({
  props: ["formHasAllOrgs", "postOrCancel"],

  setup() {
    const formState = reactive({
      audience: "Everyone",
      body: "",
      locales: "",
      orgsAll: false,
      orgsMineOrAll: "Mine",
      subject: "",
    });

    const onFinish = (values) => {
      console.log("Successful validation:", values);
    };

    const onFinishFailed = (errorInfo) => {
      console.log("Failed validation:", errorInfo);
    };

    return {
      formState,
      onFinish,
      onFinishFailed,
    };
  },

  methods: {
    onCancel() {
      this.postOrCancel(null);
    },

    onPost() {
      // onFinish or onFinishFailed should be called for validation.
      // Double-check that subject and body aren't empty.
      if (this.formState.subject && this.formState.body) {
        this.postOrCancel(this.formState);
      }
    },

    changeOrg() {
      this.formState.orgsAll = this.formState?.orgsMineOrAll === "All";
      console.log(
        "changeOrg got " +
          this.formState?.orgsMineOrAll +
          " set orgsAll to " +
          this.formState.orgsAll
      );
    },
  },
});
</script>

<style scoped>
label {
  font-weight: normal;
  margin: 0; /* override bootcamp */
}

header {
  font-size: larger;
  font-weight: bold;
  margin-bottom: 1em;
}

.buttons {
  display: flex;
  justify-content: flex-end;
}

.formItems {
  margin: 1ex;
  padding: 0;
}
</style>
