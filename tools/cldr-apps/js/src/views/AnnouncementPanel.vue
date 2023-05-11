<template>
  <!-- spinner shows if there's a delay -->
  <a-spin tip="Loading" v-if="!announcementData && !pleaseLogIn" :delay="500" />
  <p v-if="pleaseLogIn">To view announcements, please log in.</p>
  <template v-if="announcementData">
    <section class="fullJustified">
      <span class="summaryCounts">
        {{ totalCount }} announcements, {{ unreadCount }} unread
      </span>
      <span class="rightControl">
        <input type="checkbox" v-model="showUnreadOnly" /><label
          for="showUnreadOnly"
        >
          &nbsp;show unread only</label
        >
      </span>
    </section>
    <div
      class="nothingToShow"
      v-if="announcementData.announcements.length === 0"
    >
      There are no announcements yet
    </div>
    <div
      class="nothingToShow"
      v-if="
        announcementData.announcements.length > 0 &&
        unreadCount === 0 &&
        showUnreadOnly
      "
    >
      There are no unread announcements 🎉
    </div>
    <div v-if="canAnnounce" class="composeButton">
      <a-button title="Compose a new announcement" @click="startCompose">
        Compose a new announcement
      </a-button>
    </div>
    <div v-if="formIsVisible" ref="popover" class="popoverForm">
      <AnnounceForm
        :postOrCancel="finishCompose"
        :formHasAllOrgs="canChooseAllOrgs"
      />
    </div>
    <template
      v-for="(announcement, i) in announcementData.announcements"
      :key="i"
    >
      <div v-if="!showUnreadOnly || !announcement.checked">
        <div class="announcementBox">
          <section class="fullJustified">
            <span class="announcementSender">
              {{ announcement.posterName }}
            </span>
            <span class="announcementDate">
              {{ announcement.date }}
            </span>
          </section>
          <section class="announcementSubject">
            {{ announcement.subject }}
          </section>
          <div v-html="announcement.body" class="announcementBody"></div>
          <div class="rightControl">
            <input
              type="checkbox"
              v-model="announcement.checked"
              id="alreadyReadChecked"
              @change="
                (event) => {
                  checkmarkChanged(event, announcement);
                }
              "
            /><label for="alreadyReadChecked">&nbsp;I have read this</label>
          </div>
        </div>
      </div>
    </template>
  </template>
</template>

<script>
import * as cldrAnnouncement from "../esm/cldrAnnouncement.mjs";
import AnnounceForm from "./AnnounceForm.vue";
import { notification } from "ant-design-vue";

export default {
  components: {
    AnnounceForm,
  },

  data() {
    return {
      announcementData: null,
      canAnnounce: false,
      canChooseAllOrgs: false,
      formIsVisible: false,
      pleaseLogIn: false,
      showUnreadOnly: true,
      totalCount: 0,
      unreadCount: 0,
    };
  },

  created() {
    this.canAnnounce = cldrAnnouncement.canAnnounce();
    this.canChooseAllOrgs = cldrAnnouncement.canChooseAllOrgs();
    cldrAnnouncement.refresh(this.setData);
  },

  methods: {
    setData(data) {
      if (data == null) {
        this.pleaseLogIn = true;
      } else {
        this.announcementData = data;
        this.updateCounts();
      }
    },

    checkmarkChanged(event, announcement) {
      cldrAnnouncement.saveCheckmark(event.target.checked, announcement);
      this.updateCounts();
    },

    updateCounts() {
      this.totalCount = this.announcementData.announcements.length;
      let checkedCount = 0;
      for (let announcement of this.announcementData.announcements) {
        if (announcement.checked) {
          ++checkedCount;
        }
      }
      this.unreadCount = this.totalCount - checkedCount;
    },

    startCompose() {
      this.formIsVisible = true;
    },

    finishCompose(formState) {
      this.formIsVisible = false;
      if (formState) {
        cldrAnnouncement.compose(formState, this.composeResult);
      }
    },

    composeResult(result) {
      if (result?.ok) {
        notification.success({
          placement: "topLeft",
          message: "Your announcement was posted successfully",
          duration: 3,
        });
      } else {
        const errMessage = result?.err || "unknown";
        notification.error({
          placement: "topLeft",
          message: "Your announcement was not posted: " + errMessage,
        });
      }
      cldrAnnouncement.refresh(this.setData);
    },
  },
};
</script>

<style scoped>
.summaryCounts {
  display: block;
  margin-left: 0;
  margin-right: auto;
  font-size: larger;
}

.announcementBox {
  /* imitate forum style slightly */
  background-color: #f5f5f5;
  border: 1px solid #e3e3e3;
  border-radius: 3px;
  padding: 1em;
  margin: 1em;
}

.nothingToShow {
  font-weight: bold;
  font-size: 24px;
  color: #40a9ff;
  background-color: #f5f5f5;
  border: 1px solid #e3e3e3;
  border-radius: 3px;
  padding: 1em;
  margin: 1em;
}

.announcementSender {
  font-weight: bold;
  margin-left: 0;
  margin-right: auto;
  color: #40a9ff;
}

.announcementSubject {
  font-weight: bold;
  font-size: larger;
}

.announcementDate {
  display: block;
  margin-left: auto;
  margin-right: 0;
}

.announcementBody {
  border: 1px solid #1890ff;
  margin: 1ex;
  padding: 1ex;
}

.fullJustified {
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  align-items: baseline;
}

.rightControl {
  display: flex;
  justify-content: flex-end;
  text-align: baseline;
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

.composeButton {
  padding: 1em;
}

label {
  font-weight: normal;
  margin: 0; /* override bootcamp */
}

input {
  margin: 0; /* override bootcamp */
}
</style>
