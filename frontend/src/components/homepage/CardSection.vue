<script lang="ts">
import { computed, defineComponent, onMounted, reactive, ref } from 'vue'
import { useHomepageStore } from '@/stores/homepageStore.ts'

export default defineComponent({
  name: 'CardsSection',
  setup() {
    const modal = reactive({
      authorInstructions: false,
      conferenceCommittees: false,
    })

    const homepageStore = useHomepageStore()

    // Mapping universities to full names with location
    const universityNames: Record<string, string> = {
      UKF: "FPVaI UKF v Nitre:",
      UMB: "FPV UMB v Banskej Bystrici:",
      UCM: "FPV UCM v Trnave:",
    }

    // Group committees by university
    const groupedCommittees = computed(() => {
      return homepageStore.committees.length > 0
        ? homepageStore.committees.reduce((acc: Record<string, any[]>, member) => {
          if (!acc[member.university]) {
            acc[member.university] = [];
          }
          acc[member.university].push(member);
          return acc;
        }, {})
        : {};
    });

    const openModal = (modalName: keyof typeof modal) => {
      modal[modalName] = true
    }

    const closeModal = (modalName: keyof typeof modal) => {
      modal[modalName] = false
    }

    onMounted(async () => {
      await homepageStore.fetchHomepageData()
      console.log(homepageStore.fetchHomepageData())
    })

    return {
      modal,
      groupedCommittees,
      universityNames,
      openModal,
      closeModal,
    }
  },
})
</script>

<template>
  <v-container class="cards-section">
    <v-row justify="space-between">
      <!-- Card 1 -->
      <v-col sm="6" class="card-item">
        <v-card class="modal-card">
          <v-card-title class="d-flex flex-column align-center text-center">
            <v-row>
              <v-icon class="card-icon">mdi-file-document-outline</v-icon>
              <span>POKYNY PRE AUTOROV</span>
            </v-row>
          </v-card-title>
          <v-card-text>
            Konferencia je určená pre študentov, alebo kolektívy študentov 1.,
            2. a 3. stupňa vysokoškolského štúdia pod vedením školiteľa.
          </v-card-text>
          <v-card-actions class="card-actions">
            <v-btn @click="openModal('authorInstructions')">Podrobnosti</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Card 2 -->
      <v-col sm="6" class="card-item">
        <v-card class="modal-card">
          <v-card-title class="d-flex flex-column align-center text-center">
            <v-row> <v-icon class="card-icon" left>mdi-account-group-outline</v-icon>
              <span>VÝBORY KONFERENCIE</span>
            </v-row>
          </v-card-title>
          <v-card-text>
            Zoznámte sa s odbornými výbormi konferencie z univerzít, ktoré sa
            podieľajú na organizácii a hodnotení prác.
          </v-card-text>
          <v-card-actions class="card-actions">
            <v-btn @click="openModal('conferenceCommittees')"
              >Podrobnosti</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Modals -->
    <v-dialog v-model="modal.authorInstructions" max-width="1000px">
      <v-card class="modal-card">
        <v-card-text>
          <h4>Pokyny pre autorov</h4>
          <p>
            Konferencia je určená pre študentov, alebo kolektívy študentov 1.,
            2. a 3. stupňa vysokoškolského štúdia. Účastník konferencie pripraví
            vedeckú prácu pod vedením školiteľa.
          </p>
          <br />
          <ul>
            <li>
              <ins>Rozsah:</ins> <strong>4 - 8 strán</strong> vrátane tabuliek,
              obrázkov a príloh.
            </li>
            <li><ins>Abstrakt:</ins> <strong>100 - 150 slov</strong>.</li>
            <li><ins>Jazyk:</ins> Slovenský alebo Anglický.</li>
          </ul>
          <p>
            Použite jednu z uvedených šablón:
            <a
              href="/docs/sablona_SVK_2025-final.docx"
              target="_blank"
              rel="noopener noreferrer"
              >MS Word</a
            >
            alebo
            <a
              href="/docs/Tex_sablona_SVK_2023.zip"
              target="_blank"
              rel="noopener noreferrer"
              >LaTeX</a
            >. Šablóny prosím inak neupravujte a
            <ins>nevkladajte čísla strán</ins>.
          </p>

          <h4>Prezentácia práce</h4>
          Autor(i) prácu prezentujú pred odbornou komisiou:
          <ul>
            <li>Formát: <strong>PowerPoint</strong></li>
            <li>Dĺžka prezentácie: <strong>10 min</strong>.</li>
            <li>Diskusia: <strong>cca 5 min</strong>.</li>
          </ul>
          <p class="note">
            !Prezentácia a obhajoba práce sú podmienkou jej zaradenia do
            zborníka vedeckých prác!
          </p>

          <h4>Postup na vloženie práce:</h4>
          <ol>
            <li>
              Prihláste sa do systému
              <a href="https://svk-ukf.sk/">SciSubmit</a>.
            </li>
            <li>
              Zadajte údaje o autoroch, názve práce, abstrakte a kľúčových
              slovách.
            </li>
            <li>Vyberte sekciu podľa zamerania práce.</li>
            <li>Vyplňte príslušnosť (napr. katedra, fakulta, univerzita).</li>
            <li>Vložte prácu vo formáte <strong>PDF</strong>.</li>
            <li>Potvrďte proces a počkajte na výsledok recenzie.</li>
            <li>
              Upravte prácu na základe odporúčaní a nahrajte finálnu verziu.
            </li>
          </ol>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="closeModal('authorInstructions')" variant="outlined">Zatvoriť</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Conference Committees Modal -->
    <v-dialog v-model="modal.conferenceCommittees" max-width="800px">
      <v-card class="modal-card">
        <v-card-text>
          <h4 style="color: #116466;">Organizačný výbor konferencie</h4>

          <!-- Loop through universities and display their members -->
          <div v-for="(members, university) in groupedCommittees" :key="university">
            <h4>{{ universityNames[university] }}</h4>
            <ul>
              <li v-for="member in members" :key="member._id">{{ member.fullName }}</li>
            </ul>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="closeModal('conferenceCommittees')" variant="outlined">Zatvoriť</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style lang="scss" scoped>
.cards-section {
  max-width: 75%;

  .v-card {
    background-color: #f7f7f7 !important;
    color: #444;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    min-height: 200px;

    .v-card-title {
      color: #116466;
      font-weight: bolder;
      margin-left: 5px;
      padding-top: 20px;
      text-align: center;
      font-size: 1rem !important;
      word-break: keep-all;
      white-space: normal;
    }

    .v-card-text {
      margin-top: 10px;
      text-align: left;
      font-size: 0.9rem;
    }

    .card-icon {
      color: #bc463a;
      font-size: 30px;
      padding-bottom: 8px;
      margin-right: 10px;
    }
  }
  .card-item {
    margin-bottom: 20px;
  }
}

.modal-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
  border-radius: 10px !important;

  .v-card-text {
    margin-bottom: auto;
    margin-inline: 15px;
    text-align: justify;
  }

  .card-actions {
    display: flex;
    justify-content: center;
    padding: 5px 0;

    .v-btn {
      background-color: rgb(44, 53, 49, 0.2);
      color: #2c3531;
      font-weight: bolder;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      margin-inline: 10px;
      padding-inline: 10px;
    }
  }

  ul,
  ol {
    padding-left: 20px;
    font-size: 0.9rem;
  }

  ul {
    list-style-type: disc;
    padding-left: 30px;
  }

  ol {
    list-style-type: decimal;
    padding-left: 30px;
  }

  a {
    color: #bc463a;
    font-weight: bold;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
      color: #922e25;
    }
  }

  strong {
    color: #116466;
  }

  p {
    font-size: 1rem;
  }

  h4 {
    font-size: 1.2rem;
    font-weight: bold;
    color: #2c3531;
    margin-top: 15px;
    margin-bottom: 5px;
    text-decoration: underline;
  }

  li {
    margin-bottom: 5px;
  }

  .note {
    color: #922e25;
    margin-top: 15px;
    font-weight: bolder;
    text-decoration: underline;
  }

  .close-btn {
    background-color: #bc463a;
    margin-right: 10px;
    color: white;
    text-transform: none;
    &:hover {
      background-color: #922e25;
    }
  }
}
</style>
