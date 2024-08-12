<template>
  <header>Compose forum post</header>
  <a-form
    :model="formState"
    name="basic"
    autocomplete="off"
    @finish="onFinish"
    @finishFailed="onFinishFailed"
  >
    <p class="subject">{{ pi.subject }}</p>
    <p class="reminder">{{ reminder }}</p>
    <p class="postType">{{ pi.postType }}</p>
    <a-form-item
      class="formItems"
      name="body"
      :rules="[{ required: true, message: 'Please enter a message body!' }]"
    >
      <a-textarea
        v-model:value="formState.body"
        placeholder="Write your post (plain text) here..."
        :rows="4"
      />
    </a-form-item>
    <div v-if="errMessage" class="errMessage">
      {{ errMessage }}
    </div>
    <div class="buttons">
      <a-form-item>
        <a-button html-type="cancel" @click="onCancel">Cancel</a-button>
        &nbsp;
        <a-button type="primary" html-type="submit" @click="onPost"
          >Submit</a-button
        >
      </a-form-item>
    </div>
    <div v-if="pi.parentPost">
      <p>
        🛑 TODO: display the parent (root) post here (below the Cancel/Submit
        buttons)
      </p>
    </div>
  </a-form>
</template>

<script>
import { defineComponent, reactive } from "vue";
import * as cldrForum from "../esm/cldrForum.mjs";

export default defineComponent({
  props: ["pi" /* PostInfo */, "postOrCancel", "reminder"],

  setup(props) {
    const formState = reactive({
      body: cldrForum.prefillPostText(props.pi),
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

  data() {
    return {
      errMessage: "",
    };
  },

  methods: {
    onCancel() {
      this.postOrCancel(null);
    },

    onPost() {
      if (
        this.pi &&
        this.formState.body &&
        cldrForum.formIsAcceptable(this.pi, this.formState.body)
      ) {
        this.postOrCancel(this.formState);
      } else {
        // TODO: get message from formIsAcceptable, or move that here
        this.errMessage = "Your pants are on fire!";
      }
    },
  },
});
</script>

<style scoped>
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

.subject {
  font-weight: bold;
  margin-bottom: 1em;
}

.reminder {
  margin-bottom: 1em;
}

.postType {
  text-align: right;
  color: red;
}

.errMessage {
  color: red;
}
</style>
