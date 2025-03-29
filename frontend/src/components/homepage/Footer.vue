<template>
  <footer fluid class="footer">
    <!-- Contacts Section -->
    <div class="contacts-section">
      <v-container>
        <v-row justify="space-between" align="center">
          <!-- Technical Support -->
          <v-col cols="12" sm="6" class="footer-left">
            <h5 class="footer-title">Technická podpora</h5>
            <p>Mgr. Mária Pappová</p>
            <p>
              email:
              <a href="mailto:maria.pappova2@ukf.sk">maria.pappova2@ukf.sk</a>
            </p>
          </v-col>

          <!-- Faculty Info -->
          <v-col cols="12" sm="6" class="footer-right">
            <h5 class="footer-title">Fakulta prírodných vied a informatiky</h5>
            <p>Univerzita Konštantína Filozofa v Nitre</p>
            <p>Tr. A. Hlinku 1, 949 01 Nitra</p>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- Copyright Section -->
    <div class="copyright-section">
      <v-container>
        <v-row justify="center" align="center">
          <p class="copyright">© {{ new Date().getFullYear() }} SciSubmit. All Rights Reserved</p>
        </v-row>
      </v-container>
    </div>
  </footer>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Footer',
})
</script>

<style lang="scss">
.footer {
  background-color: #d1e8e2;
  padding: 20px 0 0 0;
  text-align: left;

  .footer-left,
  .footer-right {
    color: #2c3531;
    font-size: 1rem;
  }

  .footer-title {
    font-size: 1.1rem;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .footer-right {
    text-align: right;
  }

  a {
    color: #116466;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
.copyright-section {
  background-color: #2c3531;
  color: #ffffff; /* White text */
  padding: 10px 0;

  .copyright {
    font-size: 16px;
    text-align: center;
  }
}
</style>
