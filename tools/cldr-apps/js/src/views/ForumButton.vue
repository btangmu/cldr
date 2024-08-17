<template>
  <a-button v-if="!forumForm" :disabled="disabled" @click="getForm">
    {{ label }}
  </a-button>
  <template v-if="formIsVisible">
    <div ref="popover" class="popoverForm">
      <ForumForm
        :pi="pi"
        :reminder="reminder"
        @send-message="handleSendMessage"
      />
    </div>
  </template>
</template>

<script>
import * as cldrForum from "../esm/cldrForum.mjs";
import ForumForm from "./ForumForm.vue";

export default {
  components: {
    ForumForm,
  },

  data() {
    return {
      pi: null /* PostInfo */,
      label: null,
      forumForm: null,
      formIsVisible: false,
      reminder: "",
      disabled: false,
    };
  },

  methods: {
    /**
     * Set the PostInfo
     * @param {PostInfo} pi
     */
    setPostInfo(pi) {
      this.pi = pi;
    },

    setLabel(label) {
      this.label = label;
    },

    setReminder(reminder) {
      this.reminder = reminder;
    },

    setDisabled() {
      this.disabled = true;
    },

    getForm() {
      this.formIsVisible = true;
    },

    handleSendMessage(formState) {
      this.formIsVisible = false;
      if (formState?.body) {
        cldrForum.sendPostRequest(this.pi, formState.body);
      }
    },
  },
};
</script>

<style scoped>
body {
  overflow-x: hidden;
}

button {
  margin: 0.5em;
}

.popoverForm {
  display: block;
  top: 10%;
  left: 10%;
  width: 80%;
  position: absolute;
  padding: 20px 20px;
  z-index: 1200;
  background-color: #f5f5f5;
  border: 1px solid #e3e3e3;
  border-radius: 3px;
}
</style>
