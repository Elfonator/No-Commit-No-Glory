<script lang="ts">
import {
  defineComponent,
  onMounted,
  ref,
  computed,
  reactive,
  inject,
} from 'vue'
import { usePaperStore } from '@/stores/paperStore'
import { format } from 'date-fns'
import { sk } from 'date-fns/locale'
import { useUserStore } from '@/stores/userStore.ts'
import { type AdminPaper, PaperStatus } from '@/types/paper'
import axios from 'axios'

export default defineComponent({
  name: 'ConferencePapers',
  computed: {
    PaperStatus() {
      return PaperStatus
    },
  },
  setup() {
    const paperStore = usePaperStore()
    const userStore = useUserStore()
    const expandedConferenceId = ref<string | null>(null)
    const isPaperViewDialogOpen = ref(false)
    const isAssignReviewerDialogOpen = ref(false)
    const isDropdownOpen = ref(false)
    const selectedPaper = ref<AdminPaper | null>(null)
    const selectedReviewer = ref<any>(null)

    //Table headers for papers
    const tableHeaders = [
      { title: '', value: 'view', width: '10px', sortable: false },
      { title: 'Status', value: 'status', width: '50px' },
      { title: 'Autor', value: 'user' },
      { title: 'Recenzent', value: 'reviewer' },
      { title: 'Deadline', value: 'deadline_date' },
      { title: '', value: 'actions', sortable: false },
    ]

    /** Global showSnackbar function **/
    const showSnackbar = inject('showSnackbar') as ({
      message,
      color,
    }: {
      message: string
      color?: string
    }) => void

    if (!showSnackbar) {
      console.error('showSnackbar is not provided')
    }

    //Filters for conferences and pagination
    const itemsPerPage = 5 // Maximum conferences per page
    const currentPage = ref(1)

    const conferenceFilters = reactive({
      year: null,
      location: '',
    })

    const filteredConferences = computed(() => {
      return groupedPapers.value.filter(conference => {
        return (
          (!conferenceFilters.year ||
            conference.year == conferenceFilters.year) &&
          (!conferenceFilters.location ||
            conference.location
              .toLowerCase()
              .includes(conferenceFilters.location.toLowerCase()))
        )
      })
    })

    const resetConferenceFilters = () => {
      conferenceFilters.year = null
      conferenceFilters.location = ''
    }

    const paginatedConferences = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage
      const end = start + itemsPerPage
      return filteredConferences.value.slice(start, end)
    })

    //Toggle visibility of papers for a conference
    const toggleConference = (conferenceId: string | null) => {
      expandedConferenceId.value =
        expandedConferenceId.value === conferenceId ? null : conferenceId
    }

    const downloadPaper = async (conferenceId: string | undefined, paperId: string | undefined) => {
      if (!conferenceId || !paperId) {
        showSnackbar?.({ message: "Missing conference or paper ID.", color: "error" });
        return;
      }

      try {
        await paperStore.downloadPaperAdmin(conferenceId, paperId);
        showSnackbar?.({ message: "Súbor bol úspešne stiahnutý.", color: "success" });
      } catch (error) {
        showSnackbar?.({ message: "Nepodarilo sa stiahnuť súbor.", color: "error" });
      }
    };


    const downloadAllPapers = async (conferenceId: string) => {
      if (!conferenceId) {
        console.error('Conference ID is missing')
        showSnackbar?.({
          message: 'Chýba ID konferencie.',
          color: 'error',
        })
        return
      }

      try {
        console.log('Downloading all papers for conference ID:', conferenceId)
        await paperStore.downloadAllPapersInConference(conferenceId)
        console.log('Download successful')
        showSnackbar?.({
          message: 'Stiahnutie prác bolo úspešné.',
          color: 'success',
        })
      } catch (error) {
        console.error('Failed to download papers:', error)
        if (axios.isAxiosError(error)) {
          const errorMessage =
            error.response?.data?.message || 'Nepodarilo sa stiahnuť práce.'
          showSnackbar?.({
            message: errorMessage,
            color: 'error',
          })
        } else {
          showSnackbar?.({
            message: 'Neočakávaná chyba pri sťahovaní.',
            color: 'error',
          })
        }
      }
    }

    /** Filters for papers **/
    const paperFilters = reactive({
      selectedStatus: null as PaperStatus | null,
    })

    //Filtered papers for selected conference
    const filteredPapers = computed(() => {
      return paperStore.adminPapers
        .filter(paper => paper.status !== PaperStatus.Draft) // Exclude drafts
        .filter(paper => {
          // Ensure the paper belongs to the expanded conference
          const belongsToConference =
            expandedConferenceId.value === paper.conference?._id

          // Check if the paper matches the selected status filter
          const matchesStatus =
            !paperFilters.selectedStatus ||
            paper.status === paperFilters.selectedStatus

          // Include the paper if it belongs to the conference and matches the filter
          return belongsToConference && matchesStatus
        })
        .sort((a, b) => {
          // Sort by submission_date, newest first
          const dateA = new Date(a.submission_date).getTime()
          const dateB = new Date(b.submission_date).getTime()
          return dateB - dateA // Newest papers on top
        })
    })

    const resetFilters = () => {
      paperFilters.selectedStatus = null
    }

    //Group papers by conference
    const groupedPapers = computed(() => {
      const groups: { [key: string]: any } = {}
      paperStore.adminPapers
        .filter(paper => paper.status !== PaperStatus.Draft)
        .forEach(paper => {
          const { conference } = paper
          if (!conference || !conference._id) return
          if (!groups[conference._id]) {
            groups[conference._id] = { ...conference, papers: [] }
          }
          groups[conference._id].papers.push(paper)
        })
      return Object.values(groups)
    })

    const papersForConference = computed(() => {
      if (!expandedConferenceId.value) return []
      return paperStore.adminPapers.filter(
        paper => paper.conference?._id === expandedConferenceId.value,
      )
    })

    //Show paper details
    const viewPaper = async (paper: AdminPaper) => {
      try {
        selectedPaper.value = await paperStore.getPaperById(paper._id)
        isPaperViewDialogOpen.value = true
      } catch (error) {
        console.error('Error fetching paper details:', error)
        showSnackbar?.({
          message: 'Nepodarilo sa načítať podrobnosti o práci.',
          color: 'error',
        })
      }
    }

    /** Deadline changes **/
    const isDeadlineDialogOpen = ref(false)
    const newDeadline = ref<Date | null>(null)

    const isDeadlineDisabled = (conference: any) => {
      if (!conference.date) return true // if no date, disable the deadline button
      const currentDate = new Date()
      const conferenceEndDate = new Date(conference.date)
      return currentDate > conferenceEndDate // disable if the conference has ended
    }

    const openDeadlineDialog = (paper: AdminPaper) => {
      selectedPaper.value = paper
      newDeadline.value = paper.deadline_date
        ? new Date(paper.deadline_date)
        : new Date()
      isDeadlineDialogOpen.value = true
    }

    const changeDeadline = async () => {
      if (!selectedPaper.value || !newDeadline.value) return

      try {
        await paperStore.updateDeadline(
          selectedPaper.value._id,
          newDeadline.value,
        ) // Send Date object directly

        isDeadlineDialogOpen.value = false
        showSnackbar?.({
          message: 'Deadline bol úspešne aktualizovaný.',
          color: 'success',
        })
      } catch (error) {

        showSnackbar?.({
          message: 'Nepodarilo sa aktualizovať deadline.',
          color: 'error',
        })
      }
    }

    /** Dialog for assigning a reviewer**/
    //Preprocess reviewers to include fullName
    const availableReviewers = computed(() =>
      userStore.reviewers.map(user => ({
        ...user,
        fullName: `${user.first_name} ${user.last_name}`,
      })),
    )

    const isReviewerDisabled = (paper: AdminPaper) => {
      return !!paper.reviewer // disable if reviewer exists
    }

    const openAssignReviewerDialog = (paper: AdminPaper) => {
      selectedPaper.value = paper
      if (!userStore.reviewers.length) {
        userStore.fetchReviewers()
      }

      console.log('Available reviewers:', availableReviewers.value)
      selectedReviewer.value = paper.reviewer || null
      isAssignReviewerDialogOpen.value = true
    }

    const toggleDropdown = () => {
      isDropdownOpen.value = !isDropdownOpen.value
    }

    const selectReviewer = (reviewer: any) => {
      selectedReviewer.value = reviewer
      isDropdownOpen.value = false
    }

    //Assign reviewer to the selected paper
    const assignReviewer = async () => {
      if (!selectedPaper.value || !selectedReviewer.value) return

      try {
        await paperStore.assignReviewerToPaper(
          selectedPaper.value._id,
          selectedReviewer.value,
        )

        await paperStore.getAllPapers()

        closeAssignReviewerDialog()
        console.log('Reviewer assigned successfully!')
        showSnackbar?.({
          message: 'Recenzent bol úspešne priradený.',
          color: 'success',
        })
      } catch (error) {
        console.error('Error assigning reviewer:', error)
        showSnackbar?.({
          message: 'Nepodarilo sa priradiť recenzenta.',
          color: 'error',
        })
      }
    }

    const closeAssignReviewerDialog = () => {
      isAssignReviewerDialogOpen.value = false
    }

    //Format dates as dd.MM.yyyy
    const formatDate = (date: string | Date | null): string => {
      if (!date) return 'N/A'
      const parsedDate = new Date(date)
      return isNaN(parsedDate.getTime())
        ? 'Invalid Date'
        : format(parsedDate, 'dd.MM.yyyy', { locale: sk })
    }

    const isDeletePaperDialogOpen = ref(false);

    const confirmDeletePaper = (paper: AdminPaper) => {
      selectedPaper.value = paper;
      isDeletePaperDialogOpen.value = true;
    };

    const closeDeletePaperDialog = () => {
      isDeletePaperDialogOpen.value = false;
    };

    const deletePaper = async () => {
      if (!selectedPaper.value) return;

      try {
        await paperStore.adminDeletePaper(selectedPaper.value._id);
        showSnackbar?.({
          message: 'Práca bola úspešne odstránená.',
          color: 'success',
        });

        // Refresh the paper list
        await paperStore.getAllPapers();
      } catch (error) {
        console.error('Error deleting paper:', error);
        showSnackbar?.({
          message: 'Nepodarilo sa odstrániť prácu.',
          color: 'error',
        });
      } finally {
        closeDeletePaperDialog();
      }
    };

    //Fetch admin papers and reviewers
    onMounted(() => {
      paperStore.getAllPapers().then(() => {
        //console.log('Papers from API:', paperStore.adminPapers)
        const ongoingConference = groupedPapers.value.find(conference =>
          conference.papers.some((paper: AdminPaper) => paper.status === PaperStatus.Submitted)
        );

        if (ongoingConference) {
          expandedConferenceId.value = ongoingConference._id;
        }
      })
      userStore.fetchReviewers().then(() => {
        console.log('Reviewers:', userStore.reviewers)
      })
    })

    return {
      paperStore,
      expandedConferenceId,
      groupedPapers,
      tableHeaders,
      isAssignReviewerDialogOpen,
      selectedPaper,
      selectedReviewer,
      userStore,
      availableReviewers,
      isDropdownOpen,
      isPaperViewDialogOpen,
      isDeadlineDialogOpen,
      newDeadline,
      papersForConference,
      paginatedConferences,
      currentPage,
      itemsPerPage,
      conferenceFilters,
      paperFilters,
      filteredConferences,
      filteredPapers,
      PaperStatus,
      isDeletePaperDialogOpen,
      confirmDeletePaper,
      deletePaper,
      closeDeletePaperDialog,
      downloadPaper,
      isReviewerDisabled,
      isDeadlineDisabled,
      resetConferenceFilters,
      resetFilters,
      viewPaper,
      toggleDropdown,
      selectReviewer,
      openAssignReviewerDialog,
      closeAssignReviewerDialog,
      assignReviewer,
      changeDeadline,
      openDeadlineDialog,
      toggleConference,
      formatDate,
      downloadAllPapers,
    }
  },
})
</script>

<template>
  <v-card>
    <v-card-title>
      <div class="d-flex justify-space-between align-center w-100">
        <h3>Konferenčné príspevky</h3>
      </div>
    </v-card-title>
    <v-card-subtitle>
      <!-- Conference Filters -->
      <v-row class="mt-4" dense>
        <v-col cols="6" md="3">
          <v-text-field
            v-model="conferenceFilters.year"
            label="Filtrovať podľa roku"
            type="number"
            outlined
            dense
          />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field
            v-model="conferenceFilters.location"
            label="Filtrovať podľa miesta"
            outlined
            dense
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-btn color="primary" small @click="resetConferenceFilters"
            >Zrušiť filter</v-btn
          >
        </v-col>
      </v-row>
    </v-card-subtitle>

    <!-- Loop through grouped conferences -->
    <v-row>
      <v-col
        cols="12"
        v-for="conference in filteredConferences"
        :key="conference._id"
      >
        <v-card outlined class="mb-3 inner-card">
          <v-card-title>
            <v-row class="align-center">
              <!-- Conference Title Section -->
              <v-col cols="9">
                <h4>{{ conference.year }} - {{ conference.location }}</h4>
                <p>Dátum: {{ formatDate(conference.date) }}</p>
                <p class="green">Počet prác: {{ conference.papers.length }}</p>
              </v-col>

              <!-- Actions Section -->
              <v-col cols="3" class="d-flex justify-end align-center">
                <v-btn
                  color="primary"
                  @click="toggleConference(conference._id)"
                >
                  <v-icon left class="conf-icon">
                    {{
                      expandedConferenceId === conference._id
                        ? 'mdi-eye-off'
                        : 'mdi-eye'
                    }}
                  </v-icon>
                  {{
                    expandedConferenceId === conference._id
                      ? 'Skryť'
                      : 'Zobraziť'
                  }}
                  Práce
                </v-btn>
                <v-btn
                  color="tertiary"
                  class="mr-2"
                  @click="
                    paperStore.downloadAllPapersInConference(conference._id)
                  "
                >
                  <v-icon left class="conf-icon">mdi-download</v-icon>Stiahnuť
                  všetko
                </v-btn>
              </v-col>
            </v-row>
          </v-card-title>

          <!-- Toggleable section for papers -->
          <v-expand-transition>
            <div v-if="expandedConferenceId === conference._id">
              <v-card-subtitle>
                <v-row>
                  <v-col ols="6" md="4">
                    <v-select
                      v-model="paperFilters.selectedStatus"
                      :items="Object.values(PaperStatus)"
                      label="Zvolte status"
                      outlined
                      dense
                    />
                  </v-col>
                  <v-col cols="4" md="2">
                    <v-btn color="primary" small @click="resetFilters"
                      >Zrušiť filter</v-btn
                    >
                  </v-col>
                </v-row>
              </v-card-subtitle>
              <v-data-table
                :headers="tableHeaders"
                :items="filteredPapers"
                :items-per-page="10"
                :pageText="'{0}-{1} z {2}'"
                items-per-page-text="Práce na stránku"
                item-value="_id"
                dense
                class="custom-table"
              >
                <template v-slot:body="{ items }">
                  <tr
                    v-for="paper in items"
                    :key="paper._id"
                    class="custom-row"
                  >
                    <td>
                      <v-icon
                        size="30"
                        color="primary"
                        @click="viewPaper(paper)"
                        style="cursor: pointer"
                        title="Podrobnosti"
                      >
                        mdi-eye
                      </v-icon>
                    </td>
                    <!-- Status -->
                    <td>
                      <v-chip
                        :color="
                          paper.status === PaperStatus.Accepted
                            ? 'green'
                            : paper.status === PaperStatus.Rejected
                              ? 'red'
                              : paper.status === PaperStatus.AcceptedWithChanges
                                ? '#2c3531'
                                : paper.status === PaperStatus.UnderReview
                                  ? '#E7B500'
                                  : paper.status === PaperStatus.Submitted
                                    ? 'blue'
                                    : 'grey'
                        "
                        outlined
                        small
                        class="d-flex justify-center custom-chip rounded"
                      >
                        {{ paper.status }}
                      </v-chip>
                    </td>
                    <td>
                      {{ paper.user?.first_name }} {{ paper.user?.last_name }}
                    </td>
                    <td :class="{ 'text-red': !paper.reviewer }">
                      {{ paper.reviewer?.email || 'potrebné priradiť' }}
                    </td>
                    <td>{{ formatDate(paper.deadline_date) }}</td>
                    <td class="d-flex justify-end align-center">
                      <!-- Assign Reviewer -->
                      <v-btn
                        :disabled="isReviewerDisabled(paper)"
                        color="#3C888C"
                        title="Priradiť recenzenta"
                        @click="openAssignReviewerDialog(paper)"
                      >
                        <v-icon size="25">mdi-account-plus</v-icon>
                      </v-btn>
                      <v-btn
                        :disabled="isDeadlineDisabled(paper.conference)"
                        color="#FFCD16"
                        @click="openDeadlineDialog(paper)"
                        title="Upraviť termín"
                      >
                        <v-icon size="25">mdi-timer-edit</v-icon>
                      </v-btn>
                      <v-btn
                        color="#BC463A"
                        @click="confirmDeletePaper(paper)"
                        title="Odstraniť">
                        <v-icon size="25" color="white">mdi-delete</v-icon>
                      </v-btn>
                    </td>
                  </tr>
                </template>
              </v-data-table>
            </div>
          </v-expand-transition>

          <v-dialog v-model="isAssignReviewerDialogOpen" max-width="600px">
            <v-card>
              <v-card-title>Priradiť recenzenta</v-card-title>
              <v-card-text>
                <div class="custom-select">
                  <div class="select-input" @click="toggleDropdown">
                    <span>{{
                      selectedReviewer?.fullName ||
                      'Vyberte recenzenta zo zoznamu'
                    }}</span>
                    <v-icon>mdi-chevron-down</v-icon>
                  </div>
                  <div v-if="isDropdownOpen" class="dropdown-menu">
                    <div
                      v-for="reviewer in availableReviewers"
                      :key="reviewer._id"
                      class="dropdown-item"
                      @click="selectReviewer(reviewer)"
                    >
                      {{ reviewer.fullName }}, {{ reviewer.university }} ({{
                        reviewer.email
                      }})
                    </div>
                  </div>
                </div>
              </v-card-text>
              <v-card-actions>
                <v-btn color="secondary" @click="closeAssignReviewerDialog"
                  >Zrušiť</v-btn
                >
                <v-btn color="primary" @click="assignReviewer">Priradiť</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <v-dialog v-model="isPaperViewDialogOpen" max-width="900px">
            <v-card>
              <v-card-title>Detaily práce</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12">
                    <v-table dense class="paperInfo">
                      <tbody>
                        <tr class="spaced-row">
                          <td><strong>Užívateľ:</strong></td>
                          <td>
                            {{ selectedPaper?.user?.first_name }}
                            {{ selectedPaper?.user?.last_name }}
                          </td>
                        </tr>
                        <tr class="spaced-row">
                          <td><strong>Názov:</strong></td>
                          <td>{{ selectedPaper?.title }}</td>
                        </tr>
                        <tr class="spaced-row">
                          <td><strong>Kľúčové slová:</strong></td>
                          <td>{{ selectedPaper?.keywords?.join(', ') }}</td>
                        </tr>
                        <tr class="spaced-row">
                          <td><strong>Autory:</strong></td>
                          <td>
                            {{
                              selectedPaper?.authors
                                ?.map(
                                  author =>
                                    `${author.firstName} ${author.lastName}`,
                                )
                                .join(', ')
                            }}
                          </td>
                        </tr>
                        <tr class="spaced-row">
                          <td><strong>Sekcia:</strong></td>
                          <td>{{ selectedPaper?.category?.name }}</td>
                        </tr>
                        <tr class="spaced-row">
                          <td><strong>Deadline:</strong></td>
                          <td>
                            {{
                              selectedPaper?.deadline_date
                                ? formatDate(selectedPaper.deadline_date)
                                : 'N/A'
                            }}
                          </td>
                        </tr>
                        <tr class="spaced-row">
                          <td><strong>Abstrakt:</strong></td>
                          <td>
                            <em>{{ selectedPaper?.abstract }}</em>
                          </td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-col>
                </v-row>
              </v-card-text>
              <v-card-actions>
                <v-btn
                  color="primary"
                  @click="downloadPaper(selectedPaper?.conference?._id, selectedPaper?._id)">
                  <v-icon size="36">mdi-download-box</v-icon>
                  Stiahnuť
                </v-btn>
                <v-btn color="tertiary" @click="isPaperViewDialogOpen = false"
                  >Zrušiť</v-btn
                >
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-dialog v-model="isDeadlineDialogOpen" max-width="400px">
            <v-card>
              <v-card-title>Zmena termínu</v-card-title>
              <v-card-text>
                <v-date-picker v-model="newDeadline"></v-date-picker>
              </v-card-text>
              <v-card-actions>
                <v-btn @click="isDeadlineDialogOpen = false">Zrušiť</v-btn>
                <v-btn color="primary" @click="changeDeadline">Uložiť</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-dialog v-model="isDeletePaperDialogOpen" max-width="500px">
            <v-card>
              <v-card-title>Potvrdenie odstránenia</v-card-title>
              <v-card-text>
                <p>
                  Ste si istí, že chcete odstrániť prácu
                  <strong>{{ selectedPaper?.title }}</strong
                  >?
                </p>
              </v-card-text>
              <v-card-actions>
                <v-btn color="secondary" @click="closeDeletePaperDialog">Zrušiť</v-btn>
                <v-btn color="red" @click="deletePaper">Odstrániť</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </v-card>
      </v-col>
    </v-row>
    <v-pagination
      v-model="currentPage"
      :length="Math.ceil(filteredConferences.length / itemsPerPage)"
      class="mt-4"
    />
  </v-card>
</template>

<style lang="scss">
h4 {
  color: #bc4639;
}

p {
  font-size: 1rem;
  color: #2c3531;
}

.green {
  color: #116466;
}

.custom-select {
  position: relative;
  justify-self: center;
  justify-items: center;
  width: 100%;
  max-width: 500px;

  .select-input {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f5f5f5;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    z-index: 1000;

    .dropdown-item {
      padding: 10px;
      cursor: pointer;

      &:hover {
        background: #f0f0f0;
      }
    }
  }
}

.custom-table {
  font-size: 1.1rem;
  padding-inline: 30px;
}

.inner-card {
  margin-inline: 20px !important;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.conf-icon {
  margin-right: 5px;
}

.paperInfo {
  display: flex;
  font-size: 1.2rem;
}
</style>
