<template>
  <div>
    <a-spin size="large" tip="Loading" v-if="!disputes" :delay="500" />
    <div v-if="disputes && disputes.length === 0">
      There are currently no disputes for your organization.
    </div>

    <div v-if="disputes?.length && !saveInProgress">
      <button v-on:click="saveAsSpreadsheet()">
        Save as spreadsheet (.xlsx)
      </button>

      <table v-if="disputes?.length" class="disputeTable">
        <thead>
          <th>Organization</th>
          <th>Locale</th>
          <th>Path</th>
        </thead>
        <tbody>
          <tr v-for="dispute of disputes" :key="dispute.org + dispute.locale">
            <td>
              {{ dispute.org }}
            </td>
            <td>
              {{ dispute.locale }}
            </td>
            <td>
              {{ dispute.xpath }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import * as cldrDisputes from "../esm/cldrDisputes.js";

export default {
  data() {
    return {
      loading: true,
      disputes: null,
      saveInProgress: false,
    };
  },
  created() {
    cldrDisputes.viewCreated(this.setData);
  },
  methods: {
    setData(json) {
      this.loading = false;
      this.disputes = json.disputes;
    },
    saveAsSpreadsheet() {
      this.saveInProgress = true;
      cldrDisputes.saveAsSpreadsheet(
        this.disputes,
        this.saveAsSpreadsheetFinished
      );
    },
    saveAsSpreadsheetFinished() {
      this.saveInProgress = false;
    },
  },
};
</script>

<style scoped>
.disputeTable th,
.disputeTable td {
  padding: 0.5em;
  border: 1px solid black;
}
.disputeTable th {
  background-color: #ddd;
}
button {
  margin-top: 1em;
  margin-bottom: 1em;
}
</style>
