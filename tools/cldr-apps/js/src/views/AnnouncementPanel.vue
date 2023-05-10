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
    <template
      v-for="(announcement, i) in announcementData.announcements"
      :key="i"
    >
      <div v-if="!showUnreadOnly || !announcement.checked">
        <div class="announcementBox">
          <section class="fullJustified">
            <span class="announcementSender">
              {{ announcement.poster }}
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
import * as cldrAnnouncements from "../esm/cldrAnnouncement.mjs";
// import * as cldrText from "../esm/cldrText.mjs";

export default {
  data() {
    return {
      pleaseLogIn: false,
      announcementData: null,
      showUnreadOnly: true,
      totalCount: 0,
      unreadCount: 0,
    };
  },

  created() {
    cldrAnnouncements.refresh(this.setData);
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
      cldrAnnouncements.saveCheckmark(event.target.checked, announcement);
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
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.05);
  border-radius: 3px;
  padding: 1ex;
  margin-top: 0.5em;
  margin-bottom: 1.4em;
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
  border: 1px solid blue;
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

label {
  font-weight: normal;
  margin: 0; /* override bootcamp */
}

input {
  margin: 0; /* override bootcamp */
}
</style>
