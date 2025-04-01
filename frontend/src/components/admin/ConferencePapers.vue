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
import {type AdminPaper, PaperStatus} from '@/types/paper'
import axios from 'axios'
import type {ActiveCategory} from "@/types/conference.ts";
import {useCategoryStore} from "@/stores/categoryStore.ts";
import type { ReviewResponse } from '@/types/review.ts'

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
    const categoryStore = useCategoryStore()
    const expandedConferenceId = ref<string | null>(null)
    const isEditDialogOpen = ref(false)
    const isPaperViewDialogOpen = ref(false)
    const isAssignReviewerDialogOpen = ref(false)
    const selectedPaper = ref<AdminPaper | null>(null)
    const selectedReviewer = ref<any>(null)
    const menuCatOpen = ref(false)
    const isLoading = ref(false);
    const isReviewDialogOpen = ref(false)
    const selectedReview = ref<any>(null)

    //Table headers for papers
    const tableHeaders = [
      { title: '', value: 'view', width: '10px', sortable: false },
      { title: 'Status', value: 'status', width: '50px' },
      { title: 'Autor', value: 'user' },
      { title: 'Recenzent', value: 'reviewer' },
      { title: 'Deadline', value: 'deadline_date' },
      { title: '', value: 'actions', sortable: false },
    ]

    const statusOptions = [
      PaperStatus.Draft,
      PaperStatus.Submitted,
      PaperStatus.SubmittedAfterReview,
      PaperStatus.UnderReview,
      PaperStatus.Accepted,
      PaperStatus.AcceptedWithChanges,
      PaperStatus.Rejected,
    ];

    const statusColors = {
      [PaperStatus.Draft]: 'grey',
      [PaperStatus.Submitted]: 'blue',
      [PaperStatus.SubmittedAfterReview]: 'indigo',
      [PaperStatus.UnderReview]: 'orange',
      [PaperStatus.Accepted]: 'green',
      [PaperStatus.AcceptedWithChanges]: 'primary',
      [PaperStatus.Rejected]: 'red',
    };

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

    const downloadExcel = async (conferenceId: string) => {
      try {
        await paperStore.downloadExcel(conferenceId)
        showSnackbar?.({ message: 'Excel bol úspešne stiahnutý.', color: 'success' })
      } catch {
        showSnackbar?.({ message: 'Nepodarilo sa stiahnuť Excel.', color: 'error' })
      }
    }

    /** Filters for papers **/
    const paperFilters = reactive({
      selectedStatus: null as PaperStatus | null,
      userSearch: '',
    })

    // Filtered papers for selected conference and user
    const filteredPapers = computed(() => {
      return paperStore.adminPapers
        .filter(paper => paper.status !== PaperStatus.Draft) // Exclude drafts
        .filter(paper => {
          const belongsToConference =
            expandedConferenceId.value === paper.conference?._id

          const matchesStatus =
            !paperFilters.selectedStatus ||
            paper.status === paperFilters.selectedStatus

          const matchesUser =
            !paperFilters.userSearch ||
            paper.user?.first_name?.toLowerCase().includes(paperFilters.userSearch.toLowerCase()) ||
            paper.user?.last_name?.toLowerCase().includes(paperFilters.userSearch.toLowerCase())

          return belongsToConference && matchesStatus && matchesUser
        })
        .sort((a, b) => {
          const dateA = new Date(a.submission_date).getTime()
          const dateB = new Date(b.submission_date).getTime()
          return dateB - dateA
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

    const openReviewDialog = async (paper: AdminPaper) => {
      try {
        if (!paper.review) {
          showSnackbar?.({ message: 'Pre túto prácu nie je recenzia.', color: 'warning' });
          return;
        }

        selectedReview.value = paper.review;
        isReviewDialogOpen.value = true;
      } catch (error) {
        console.error('Chyba pri načítaní recenzie:', error);
        showSnackbar?.({ message: 'Nepodarilo sa načítať recenziu.', color: 'error' });
      }
    };

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
        if (isLoading.value) return; // prevent double-clicks

        isLoading.value = true;
        try {
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
        }catch (err) {
          console.error(err);
        } finally {
          isLoading.value = false;
        }
    }

    /** Dialog for editing submission information **/
    const addAuthor = () => {
      if (selectedPaper.value && !selectedPaper.value.authors) {
        selectedPaper.value.authors = [];
      }
      selectedPaper.value?.authors.push({ firstName: '', lastName: '' });
    }

    const removeAuthor = (index: number) => {
      if (selectedPaper.value?.authors) {
        selectedPaper.value.authors.splice(index, 1);
      }
    }

    const openEditDialog = async (paper: AdminPaper) => {
      try {
        selectedPaper.value = await paperStore.getPaperById(paper._id);
        isEditDialogOpen.value = true;
      } catch (error) {
        console.error('Error fetching paper details:', error);
        showSnackbar?.({
          message: 'Nepodarilo sa načítať detaily práce.',
          color: 'error',
        });
      }
    };


    const closeEditDialog = () => {
      isEditDialogOpen.value = false;
    };

    const saveEditedPaper = async () => {
      if (isLoading.value) return; // prevent double-clicks

      isLoading.value = true;
      try {
      if (!selectedPaper.value) return;

      try {
        const id = selectedPaper.value._id;
        const updates = {
          authors: selectedPaper.value.authors,
          category: selectedPaper.value.category?._id,
        };

        await paperStore.updatePaperAdmin(id, updates);
        await paperStore.getAllPapers();

        showSnackbar?.({
          message: 'Práca bola úspešne aktualizovaná',
          color: 'success',
        });
        closeEditDialog();
      } catch (error) {
        console.error('Error updating paper:', error);
        showSnackbar?.({
          message: 'Aktualizácia práce zlyhala',
          color: 'error',
        });
      }
    }catch (err) {
      console.error(err);
    } finally {
      isLoading.value = false;
    }
    };

    const selectCategory = (category: ActiveCategory) => {
      if (selectedPaper.value) {
        selectedPaper.value.category = { _id: category._id, name: category.name };
        menuCatOpen.value = false;
      }
    };

    const selectedCategory = computed(() =>
      selectedPaper?.value?.category ? `${selectedPaper?.value.category.name}` : '',
    )

    /** Dialog for assigning a reviewer**/
    //Preprocess reviewers to include fullName
    const availableReviewers = computed(() =>
      userStore.reviewers.map(user => ({
        ...user,
        fullName: `${user.first_name} ${user.last_name}`,
      })),
    )

    const openAssignReviewerDialog = (paper: AdminPaper) => {
      selectedPaper.value = paper
      if (!userStore.reviewers.length) {
        userStore.fetchReviewers()
      }

      console.log('Available reviewers:', availableReviewers.value)
      selectedReviewer.value =
        availableReviewers.value.find(r => r._id === paper.reviewer) || null;
      isAssignReviewerDialogOpen.value = true
    }

    const reviewerSearch = ref('')

    const customReviewerFilter = (item: any, queryText: string) => {
      const search = queryText.toLowerCase()
      return (
        item.fullName.toLowerCase().includes(search) ||
        item.email?.toLowerCase().includes(search) ||
        item.university?.toLowerCase().includes(search)
      )
    }

    //Assign reviewer to the selected paper
    const assignReviewer = async () => {
      if (isLoading.value) return; // prevent double-clicks

      isLoading.value = true;
      try {
        if (!selectedPaper.value || !selectedReviewer.value) return

        if (
          selectedPaper.value.reviewer &&
          selectedPaper.value.reviewer !== selectedReviewer.value._id
        ) {
          const confirmed = confirm(
            "Táto práca už má recenziu od iného recenzenta. Pokračovaním sa táto recenzia vymaže. Pokračovať?"
          );
          if (!confirmed) {
            isLoading.value = false;
            return;
          }
        }
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
        }catch (err) {
          console.error(err);
        } finally {
          isLoading.value = false;
        }
    }

    const closeAssignReviewerDialog = () => {
      isAssignReviewerDialogOpen.value = false
    }

    /** Show review for paper **/
    const ratingResponses = computed(() => {
      return (selectedReview.value?.responses || []).filter((r: ReviewResponse) => {
        return typeof r.question === 'object' && r.question.type === 'rating';
      });
    });

    const yesNoResponses = computed(() => {
      return (selectedReview.value?.responses || []).filter((r: ReviewResponse) => {
        return typeof r.question === 'object' && r.question.type === 'yes_no';
      });
    });

    const textResponses = computed(() => {
      return (selectedReview.value?.responses || []).filter((r: ReviewResponse) => {
        return typeof r.question === 'object' && r.question.type === 'text';
      });
    });


    const getRatingColor = (score: number) => {
      if (score >= 5) return 'green';
      if (score >= 3) return 'orange';
      return 'red';
    };

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
        // Expand the first conference that has a paper with a review
        const reviewedConference = groupedPapers.value.find(conference =>
          conference.papers.some((paper: AdminPaper) => !!paper.review)
        )

        if (reviewedConference) {
          expandedConferenceId.value = reviewedConference._id
        } else {
          // fallback: expand a conference with Submitted paper
          const fallback = groupedPapers.value.find(conference =>
            conference.papers.some((paper: AdminPaper) => paper.status === PaperStatus.Submitted)
          )
          if (fallback) {
            expandedConferenceId.value = fallback._id
          }
        }
      })

      userStore.fetchReviewers()
      categoryStore.fetchParticipantCategories()
    })

    return {
      paperStore,
      expandedConferenceId,
      groupedPapers,
      tableHeaders,
      statusOptions,
      statusColors,
      isAssignReviewerDialogOpen,
      selectedPaper,
      selectedReviewer,
      categoryStore,
      userStore,
      availableReviewers,
      isEditDialogOpen,
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
      menuCatOpen,
      selectedCategory,
      reviewerSearch,
      isLoading,
      isReviewDialogOpen,
      selectedReview,
      ratingResponses,
      yesNoResponses,
      textResponses,
      getRatingColor,
      customReviewerFilter,
      addAuthor,
      removeAuthor,
      saveEditedPaper,
      openEditDialog,
      closeEditDialog,
      selectCategory,
      confirmDeletePaper,
      deletePaper,
      closeDeletePaperDialog,
      downloadPaper,
      downloadExcel,
      isDeadlineDisabled,
      resetConferenceFilters,
      resetFilters,
      viewPaper,
      openReviewDialog,
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
    <v-card-subtitle class="filters-section">
      <!-- Conference Filters -->
      <v-row no-gutters>
        <v-col cols="3" md="2">
          <v-text-field
            v-model="conferenceFilters.year"
            label="Rok"
            type="number"
            outlined
            density="compact"
            clearable
          />
        </v-col>
        <v-col cols="5" md="3">
          <v-text-field
            v-model="conferenceFilters.location"
            label="Miesto"
            outlined
            density="compact"
            clearable
          />
        </v-col>
        <v-col cols="4" md="2">
          <v-btn
            class="filter-btn"
            color="primary"
            @click="resetConferenceFilters"
            title="Zrušiť filter"
            variant="outlined">
            <v-icon>mdi-filter-remove</v-icon>
          </v-btn>
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
              <v-col cols="7">
                <h4>{{ conference.year }} - {{ conference.location }}</h4>
              </v-col>
              <v-col cols="2" class="d-flex justify-end align-center">
                <h5>Dátum: {{ formatDate(conference.date) }}</h5>
              </v-col>
              <v-col cols="3" class="d-flex justify-end align-center">
                <p class="green">Počet prác: {{ conference.papers.length }}</p>
              </v-col>
              <!-- Actions Section -->
              <v-col cols="3" class="d-flex justify-start align-center">
                <v-btn
                  color="primary"
                  class="mr-2"
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
                  variant="outlined"
                  color="tertiary"
                  class="mr-2"
                  @click="
                    paperStore.downloadAllPapersInConference(conference._id)
                  "
                >
                  <v-icon left class="conf-icon">mdi-download</v-icon>Stiahnuť
                </v-btn>
                <v-btn
                  variant="outlined"
                  color="primary"
                  @click="downloadExcel(conference._id)"
                >
                  <v-icon left class="conf-icon">mdi-microsoft-excel</v-icon>Excel
                </v-btn>
              </v-col>
            </v-row>
          </v-card-title>

          <!-- Toggleable section for papers -->
          <v-expand-transition>
            <div v-if="expandedConferenceId === conference._id">
              <v-card-subtitle class="filters-section">
                <v-row no-gutters>
                  <v-col cols="7" md="3">
                    <v-select
                      v-model="paperFilters.selectedStatus"
                      :items="Object.values(PaperStatus)"
                      label="Zvolte status"
                      outlined
                      density="compact"
                      clearable
                    />
                  </v-col>
                  <v-col cols="6" md="3">
                    <v-text-field
                      v-model="paperFilters.userSearch"
                      label="Autor"
                      outlined
                      density="compact"
                      clearable
                    />
                  </v-col>
                  <v-col cols="3" md="2">
                    <v-btn
                      class="filter-btn"
                      color="primary"
                      @click="resetFilters"
                      title="Zrušiť filter"
                      variant="outlined">
                      <v-icon>mdi-filter-remove</v-icon>
                    </v-btn>
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
                density="comfortable"
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
                        size="22"
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
                        :color="statusColors[paper.status as PaperStatus]"
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
                        color="#3C888C"
                        title="Priradiť recenzenta"
                        @click="openAssignReviewerDialog(paper)"
                      >
                        <v-icon size="20">mdi-account-plus</v-icon>
                      </v-btn>
                      <!-- Edit Paper -->
                      <v-btn
                        color="#FFCD16"
                        @click="openEditDialog(paper)"
                        title="Upraviť prácu">
                        <v-icon size="20">mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn
                        :disabled="isDeadlineDisabled(paper.conference)"
                        color="tertiary"
                        @click="openDeadlineDialog(paper)"
                        title="Upraviť termín"
                      >
                        <v-icon size="20" color="black">mdi-timer-edit</v-icon>
                      </v-btn>
                      <v-btn
                        color="#BC463A"
                        @click="confirmDeletePaper(paper)"
                        title="Odstraniť">
                        <v-icon size="20">mdi-delete</v-icon>
                      </v-btn>
                    </td>
                  </tr>
                </template>
              </v-data-table>
            </div>
          </v-expand-transition>

          <!-- Assing reviewer dialog -->
          <v-dialog v-model="isAssignReviewerDialogOpen" max-width="600px">
            <v-card>
              <v-card-title>Priradiť recenzenta</v-card-title>
              <v-card-text>
                <v-autocomplete
                  v-model="selectedReviewer"
                  :items="availableReviewers"
                  item-title="fullName"
                  :item-value="reviewer => reviewer"
                  label="Vyberte recenzenta"
                  return-object
                  outlined
                  dense
                  clearable
                  :search-input.sync="reviewerSearch"
                  :filter="customReviewerFilter"
                />
              </v-card-text>
              <v-card-actions>
                <v-btn :loading="isLoading"
                       variant="outlined"
                       color="#BC463A"
                       @click="closeAssignReviewerDialog"
                  >Zrušiť</v-btn
                >
                <v-btn
                  :loading="isLoading"
                  variant="outlined"
                  color="primary"
                  @click="assignReviewer">Priradiť</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- Paper view dialog -->
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
                          <td><strong>Autori:</strong></td>
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
                <v-btn variant="outlined" color="#BC463A" @click="isPaperViewDialogOpen = false"
                >Zrušiť</v-btn
                >
                <v-btn
                  color="tertiary"
                  @click="openReviewDialog(selectedPaper!)"
                  :disabled="!selectedPaper?.review"
                  variant="outlined"
                >
                  <v-icon size="20">mdi-account-alert</v-icon>
                  Recenzia
                </v-btn>
                <v-btn
                  variant="outlined"
                  color="primary"
                  @click="downloadPaper(selectedPaper?.conference?._id, selectedPaper?._id)">
                  <v-icon size="22">mdi-download-box</v-icon>
                  Stiahnuť
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- Review dialog -->
          <v-dialog v-model="isReviewDialogOpen" max-width="800px">
            <v-card>
              <v-card-title>
                Recenzia
                <v-spacer></v-spacer>
                <v-chip
                  :color="selectedReview?.recommendation === 'Publikovať' ? 'green'
                : selectedReview?.recommendation === 'Odmietnuť' ? 'red'
                : 'orange'">
                  {{ selectedReview?.recommendation }}
                </v-chip>
              </v-card-title>

              <v-divider></v-divider>

              <v-card-text>
                <div v-if="selectedReview?.comments">
                  <h4>Komentár recenzenta</h4>
                  <p>{{ selectedReview.comments }}</p>
                </div>

                <div v-if="selectedReview?.responses?.length">
                  <h4 class="mt-4">Otázky a odpovede</h4>
                  <v-list dense>
                    <v-list-item
                      v-for="(resp, index) in selectedReview.responses"
                      :key="index"
                    >
                      <v-list-item>
                        <v-list-item-title><strong>Otázka:</strong> {{ resp.question?.text || resp.question }}</v-list-item-title>
                        <v-list-item-subtitle><strong>Odpoveď:</strong> {{ resp.answer }}</v-list-item-subtitle>
                      </v-list-item>
                    </v-list-item>
                  </v-list>
                </div>
              </v-card-text>

              <v-card-actions>
                <v-spacer />
                <v-btn variant="outlined" color="primary" @click="isReviewDialogOpen = false">
                  Zavrieť
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <v-dialog v-model="isReviewDialogOpen" max-width="800px">
            <v-card>
              <v-card-title class="d-flex align-center">
                <span class="text-h5">Recenzia práce</span>
                <v-spacer></v-spacer>
                <v-chip
                  :color="selectedReview.recommendation === 'Publikovať' ? 'green' :
                selectedReview.recommendation === 'Odmietnuť' ? 'red' : 'orange'"
                  class="ml-2">
                  {{ selectedReview.recommendation }}
                </v-chip>
              </v-card-title>

              <v-divider></v-divider>

              <v-card-text>
                <!-- Comments section -->
                <div v-if="selectedReview.comments" class="my-4">
                  <h3 class="text-h6 mb-2">Komentáre recenzenta</h3>
                  <v-card variant="outlined" class="pa-3 bg-grey-lighten-4">
                    <p>{{ selectedReview.comments }}</p>
                  </v-card>
                </div>

                <!-- Rating questions -->
                <div v-if="ratingResponses.length" class="my-4">
                  <h3 class="text-h6 mb-2">Bodové hodnotenie</h3>
                  <v-table density="compact">
                    <thead>
                    <tr>
                      <th>Kritérium</th>
                      <th class="text-center">Hodnotenie</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="response in ratingResponses" :key="response._id">
                      <td>{{ response.question.text }}</td>
                      <td class="text-center">
                        <v-chip
                          :color="getRatingColor(Number(response.answer))"
                          size="small"
                          class="font-weight-bold">
                          {{ response.answer }} / {{ response.question.options.max }}
                        </v-chip>
                      </td>
                    </tr>
                    </tbody>
                  </v-table>
                </div>

                <!-- Yes/No questions -->
                <div v-if="yesNoResponses.length" class="my-4">
                  <h3 class="text-h6 mb-2">Kontrolné otázky</h3>
                  <v-table density="compact">
                    <thead>
                    <tr>
                      <th>Otázka</th>
                      <th class="text-center">Odpoveď</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="response in yesNoResponses" :key="response._id">
                      <td>{{ response.question.text }}</td>
                      <td class="text-center">
                        <v-chip
                          :color="response.answer === 'yes' ? 'green' : 'red'"
                          size="small">
                          {{ response.answer === 'yes' ? 'Áno' : 'Nie' }}
                        </v-chip>
                      </td>
                    </tr>
                    </tbody>
                  </v-table>
                </div>

                <!-- Text questions -->
                <div v-if="textResponses.length" class="my-4">
                  <h3 class="text-h6 mb-2">Slovné hodnotenie</h3>
                  <v-expansion-panels variant="accordion">
                    <v-expansion-panel
                      v-for="response in textResponses"
                      :key="response._id">
                      <v-expansion-panel-title>
                        {{ response.question.text }}
                      </v-expansion-panel-title>
                      <v-expansion-panel-text>
                        {{ response.answer || 'Žiadna odpoveď' }}
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </div>
              </v-card-text>

              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn
                  variant="outlined"
                  color="primary"
                  @click="isReviewDialogOpen = false">
                  Zatvoriť
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- Deadline change dialog -->
          <v-dialog v-model="isDeadlineDialogOpen" max-width="400px">
            <v-card>
              <v-card-title>Zmena termínu</v-card-title>
              <v-card-text>
                <v-date-picker v-model="newDeadline"></v-date-picker>
              </v-card-text>
              <v-card-actions>
                <v-btn variant="outlined" @click="isDeadlineDialogOpen = false" color="#BC463A">Zrušiť</v-btn>
                <v-btn variant="outlined" color="primary" @click="changeDeadline">Uložiť</v-btn>
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
                <v-btn variant="outlined" color="primary" @click="closeDeletePaperDialog">Zrušiť</v-btn>
                <v-btn variant="outlined" color="#BC463A" @click="deletePaper">Odstrániť</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- Paper Edit -->
          <v-dialog v-model="isEditDialogOpen" max-width="600px">
            <v-card>
              <v-card-title>Úprava práce</v-card-title>
              <v-card-text>
                <v-row>
                  <!-- Category Edit -->
                  <v-col cols="12" md="12">
                    <v-menu
                      v-model="menuCatOpen"
                      close-on-content-click
                      offset-y
                      class="custom-menu"
                    >
                      <template v-slot:activator="{ props }">
                        <v-text-field
                          v-bind="props"
                          label="Kategória"
                          v-model="selectedCategory"
                          outlined
                          dense
                          readonly
                          append-inner-icon="mdi-chevron-down"
                          class="large-text-field"
                          :rules="[() => !!selectedPaper?.category || 'Vyberte kategóriu']"
                        />
                      </template>
                      <v-list>
                        <v-list-item
                          v-for="category in categoryStore.participantCategories"
                          :key="category._id"
                          @click="selectCategory(category)"
                        >
                          <v-list-item-title>
                            {{ category.name }}
                          </v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </v-col>
                </v-row>

                <v-row class="row_height" v-for="(author, index) in selectedPaper?.authors || []" :key="index">
                  <v-col cols="5" md="5">
                    <v-text-field
                      v-model="author.firstName"
                      label="Meno"
                      outlined
                      dense
                    />
                  </v-col>
                  <v-col cols="5" md="6">
                    <v-text-field
                      v-model="author.lastName"
                      label="Priezvisko"
                      outlined
                      dense
                    />
                  </v-col>
                  <v-col cols="2" md="1" class="d-flex justify-end">
                    <v-btn @click="removeAuthor(index)" color="#BC463A" variant="flat">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
                <v-btn color="primary" @click="addAuthor">
                  <v-icon icon="mdi-plus-circle" start></v-icon>Ďalší autor
                </v-btn>
              </v-card-text>

              <v-divider class="my-4" />
              <v-row v-if="selectedPaper?.review">
                <v-col cols="12">
                  <h4>Recenzia</h4>
                  <v-list two-line>
                    <v-list-item v-for="(response, index) in selectedPaper.review?.responses" :key="index">
                      <v-list-item>
                        <v-list-item-title>
                          <strong>Otázka {{ index + 1 }}:</strong> {{ response.question }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                          {{ response.answer }}
                        </v-list-item-subtitle>
                      </v-list-item>
                    </v-list-item>
                  </v-list>
                  <v-textarea
                    v-if="selectedPaper.review?.comments"
                    label="Komentár recenzenta"
                    :model-value="selectedPaper.review.comments"
                    readonly
                    auto-grow
                    outlined
                    class="mt-3"
                  />
                </v-col>
              </v-row>

              <!-- Dialog Actions -->
              <v-card-actions>
                <v-btn variant="outlined" @click="closeEditDialog" color="#BC463A">Zrušiť</v-btn>
                <v-btn variant="outlined" @click="saveEditedPaper" color="primary">Uložiť zmeny</v-btn>
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

p, h5 {
  font-size: 0.95rem;
  color: #2c3531;
}

.green {
  color: #116466;
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
  font-size: 0.9rem;
}

.dynamic-button {
  font-size: clamp(12px, 2vw, 16px);
  white-space: normal;
  text-align: center;
}
</style>
