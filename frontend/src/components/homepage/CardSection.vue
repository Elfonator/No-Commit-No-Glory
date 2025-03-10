<script lang="ts">
import { computed, defineComponent, onMounted, reactive, ref } from 'vue'
import { useHomepageStore } from '@/stores/homepageStore.ts'

export default defineComponent({
  name: 'CardsSection',
  setup() {
    const modal = reactive({
      authorInstructions: false,
      conferenceCommittees: false,
      pastConferences: false,
      awardedWorks: false,
    })

    const homepageStore = useHomepageStore()

    const awardedWorks = ref([
      {
        name: 'Biológia, ekológia a environmentalistika',
        works: [
          {
            title:
              'Morfologická a cytotypová variabilita v skupinách druhov Erysimum odoratum a E. virgatum (Brassicaceae)',
            authors: [
              'Richard Bačák',
              'Judita Zozomová',
              'Barbora Šingliarová',
            ],
          },
          {
            title:
              'Štruktúra a diverzita spoločenstiev pakomárov (Chironomidae) mestských pondov',
            authors: ['Silvia Bartóková', 'Ladislav Hamerlík'],
          },
          {
            title:
              'Vplyv zloženia média na produkciu PHB baktériou Cupriavidus necator',
            authors: [
              'Soňa Ronďošová',
              'Daniela Chmelová',
              'Miroslav Ondrejovič',
            ],
          },
        ],
      },
      {
        name: 'Biotechnológie',
        works: [
          {
            title:
              'Využitie systému CRISPR-Cas9 pre štúdium funkcie vybraných génov u Euglena gracilis',
            authors: [
              'Terézia Blažeková',
              'Vanessa Gelanová',
              'Andrej Jedlička',
              'Dominika Vešelényiová',
            ],
          },
          {
            title:
              'Zvýšenie podielu kmeňových buniek v kalusovom pletive z nechtíka lekárskeho (Calendula officinalis L.)',
            authors: [
              'Klaudia Lenkavská',
              'Marcela Gubišová',
              'Ján Kraic',
              'Šarlota Kaňuková',
            ],
          },
          {
            title:
              'Příprava a charakterizace želé cukrovinek s přídavkem extraktu brusnice borůvky (Vaccinium myrtillus)',
            authors: ['Pavlína Knapovská', 'Eva Vítová'],
          },
        ],
      },
      {
        name: 'Geografia a odborová didaktika',
        works: [
          {
            title:
              'Pohybová sústava človeka - tvorba úloh podporujúcich tvorivosť žiakov gymnázií',
            authors: ['Artem Kravchenko', 'Anna Sandanusová'],
          },
          {
            title: 'Hodnotenie cykloturistickej siete v regióne Turiec',
            authors: ['Tomáš Šuvada', 'Michaela Žoncová'],
          },
          {
            title: 'Špecifiká migrácie zo severnej Afriky do Európskej únie',
            authors: ['Boris Brath', 'Miroslava Trembošová'],
          },
        ],
      },
      {
        name: 'Chémia, fyzika a matematika',
        works: [
          {
            title:
              'Príprava a charakterizácia inovovaného sorbentu AsO43- iónov na báze Mg-modifikovaného biouhlia',
            authors: [
              'Kristína Beliančínová',
              'Gerhard Soja',
              'Vladimír Frišták',
            ],
          },
          {
            title: 'Hexakoordinované Co(II) komplexy obsahujúce Schiffove bázy',
            authors: ['Jerguš Rosík', 'Cyril Rajnák'],
          },
          {
            title:
              'Vývoj a syntéza nových typov fotosenzibilátorov s medicínskym aplikačným potenciálom',
            authors: ['Dominika Kendrová', 'Zita Tokárová'],
          },
        ],
      },
      {
        name: 'Informatika',
        works: [
          {
            title:
              'Management elektrickej energie pomocou fotovoltaických systémov',
            authors: ['Pavol Lukačka', 'Marián Hosťovecký'],
          },
          {
            title: 'Implementácia mobilného robota v prostredí ROS',
            authors: ['Filip Vojník', 'Michal Vagač'],
          },
          {
            title:
              'Porovnanie algoritmov generujúcich dokonalé bludiská pre potreby 3D mobilnej videohry',
            authors: ['Filip Vojník', 'Michal Vagač'],
          },
        ],
      },
      {
        name: 'PhD I.',
        works: [
          {
            title:
              'Vplyv liečiva cemtirestat na biochemické a štrukturálne charakteristiky kostného tkaniva na modeli diabetických potkanov',
            authors: ['Dominika Martinčeková', 'František Strejček'],
          },
          {
            title:
              'In silico a in vitro štúdia sexuálneho potenciálu asexuálnej Euglena gracilis',
            authors: [
              'Andrej Jedlička',
              'Vanessa Gelanová',
              'Dominika Vešelényiová',
              'Juraj Krajčovič',
            ],
          },
          {
            title:
              'Stanovenie intracelulárne akumulovaného PHA v baktériách druhu Cupriavidus necator s využitím Sudan Black B',
            authors: [
              'Ľubomíra Jurečková',
              'Daniela Chmelová',
              'Miroslav Ondrejovič',
            ],
          },
        ],
      },
      {
        name: 'PhD II.',
        works: [
          {
            title:
              'BsmI VDR gene polymorphism and lipid profile levels in subjects with pulmonary tuberculosis',
            authors: ['Karolína Kubalová', 'Marta Mydlárová Blaščáková'],
          },
          {
            title:
              'Stanovení těkavých látek ve víně – Nástrahy kvantitativní analýzy při využití mikroextrakce na tuhou fázi',
            authors: ['Michal Gross'],
          },
          {
            title:
              'Povodňové riziká v priemyselných areáloch situovaných v blízkosti riek v Nitrianskom samosprávnom kraji',
            authors: ['Adam Čaplák', 'Henrich Grežo'],
          },
        ],
      },
    ])

    const pastConferences = ref([
      {
        year: 'ŠVK 2023',
        date: '4. apríl 2023',
        documents: [
          {
            name: 'Zoznam ocenených prác',
            link: '/docs/Vysledky_SVK_2023.pdf',
          },
          {
            name: 'Zoznam publikovaných prác',
            link: '/docs/2023_published_works.pdf',
          },
          {
            name: 'Zborník recenzovaných príspevkov, ISBN 978-80-558-2024-8',
            link: '/docs/Zbornik_SVK_2023.pdf',
          },
        ],
      },
      {
        year: 'ŠVK 2022',
        date: '',
        documents: [
          {
            name: 'Zoznam ocenených prác',
            link: '/docs/2022_awarded_works.pdf',
          },
          {
            name: 'Zoznam publikovaných prác',
            link: '/docs/2022_published_works.pdf',
          },
          {
            name: 'Zborník recenzovaných príspevkov, ISBN 978-80-557-1984-9',
            link: '/docs/2022_proceedings.pdf',
          },
        ],
      },
      {
        year: 'ŠVK 2021',
        date: '',
        documents: [
          {
            name: 'Zoznam ocenených prác',
            link: '/docs/2021_awarded_works.pdf',
          },
          {
            name: 'Zoznam publikovaných prác',
            link: '/docs/2021_published_works.pdf',
          },
          {
            name: 'Zborník recenzovaných príspevkov, ISBN 978-80-558-1712-5',
            link: '/docs/2021_proceedings.pdf',
          },
        ],
      },
    ])

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
      awardedWorks,
      pastConferences,
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
      <v-col cols="12" sm="4" class="card-item">
        <v-card class="modal-card">
          <v-card-title class="d-flex flex-column align-center text-center">
            <v-icon class="card-icon" size="40">mdi-file-document-outline</v-icon>
            <span>POKYNY PRE AUTOROV</span>
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
      <v-col cols="12" sm="4" class="card-item">
        <v-card class="modal-card">
          <v-card-title class="d-flex flex-column align-center text-center">
            <v-icon class="card-icon" left>mdi-account-group-outline</v-icon>
            <span>VÝBORY KONFERENCIE</span>
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

      <!-- Card 3 -->
      <v-col cols="12" sm="4" class="card-item">
        <v-card class="modal-card">
          <v-card-title class="d-flex flex-column align-center text-center">
            <v-icon class="card-icon" left>mdi-clock-outline</v-icon>
            <span>MINULÉ PRÁCE</span>
          </v-card-title>
          <v-card-text>
            Objavte úspechy a zaujímavé práce z aktuálného a tiež
            predchádzajúcich ročníkov konferencie.
          </v-card-text>
          <v-card-actions class="card-actions">
            <v-btn @click="openModal('awardedWorks')">Ocenené</v-btn>
            <v-btn @click="openModal('pastConferences')">Všetko</v-btn>
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
              href="/docs/sablona_SVK_2023.docx"
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
              <a href="/homepage">SciSubmit</a>.
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
          <v-btn @click="closeModal('authorInstructions')">Zatvoriť</v-btn>
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
          <v-btn @click="closeModal('conferenceCommittees')">Zatvoriť</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="modal.awardedWorks" max-width="1000px">
      <v-card class="modal-card">
        <v-card-text>
          <!-- Dynamic Section Blocks -->
          <div
            v-for="(category, index) in awardedWorks"
            :key="index"
            class="category-block"
          >
            <h4>{{ category.name }}</h4>
            <ul>
              <li v-for="(work, idx) in category.works" :key="idx">
                <strong>{{ work.title }}</strong>
                <br />
                Autori: {{ work.authors.join(', ') }}
              </li>
            </ul>
          </div>
        </v-card-text>
        <v-card-actions class="card-actions">
          <v-btn @click="closeModal('awardedWorks')">Zatvoriť</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="modal.pastConferences" max-width="1000px">
      <v-card class="modal-card">
        <v-card-text>
          <div
            v-for="(edition, index) in pastConferences"
            :key="index"
            class="edition-block"
          >
            <h4>{{ edition.year }}</h4>
            <p><strong>Dátum:</strong> {{ edition.date }}</p>
            <ul>
              <li v-for="(doc, idx) in edition.documents" :key="idx">
                <a :href="doc.link" target="_blank" rel="noopener noreferrer">{{
                  doc.name
                }}</a>
              </li>
            </ul>
          </div>
        </v-card-text>
        <v-card-actions class="card-actions">
          <v-btn @click="closeModal('pastConferences')">Zatvoriť</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style lang="scss">
.cards-section {
  margin-top: 20px;
  margin-bottom: 20px;
  max-width: 75%;

  .v-card {
    background-color: #f7f7f7 !important;
    color: #444;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    min-height: 280px;

    .v-card-title {
      color: #116466;
      font-weight: bolder;
      margin-left: 5px;
      padding-top: 40px;
      text-align: center;
      font-size: 1.1rem !important;
    }

    .v-card-text {
      margin: 10px 0 0 10px;
      text-align: left;
      font-size: 1.2rem;
    }

    .card-icon {
      color: #bc463a;
      font-size: 36px;
      padding-bottom: 8px;
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
    margin-top: auto;
    padding: 16px 0;

    .v-btn {
      background-color: rgb(44, 53, 49, 0.3);
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
    font-size: 1.2rem;
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
    font-size: 1.2rem;
  }

  h4 {
    font-size: 1.5rem;
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
