<script lang="ts">
import {
  defineComponent,
  reactive,
  computed,
  ref,
  onMounted,
  inject, watchEffect, nextTick
} from 'vue'
import { usePaperStore } from '@/stores/paperStore'
import { useConferenceStore } from '@/stores/conferenceStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { format } from 'date-fns'
import { type Paper, PaperStatus, type ReviewerPaper } from '@/types/paper.ts'
import type {
  ActiveCategory,
  ParticipantConference,
} from '@/types/conference.ts'
import { useUserStore } from '@/stores/userStore.ts'
import type { UnwrapRef } from '@vue/runtime-core'
import type { VForm } from 'vuetify/lib/components/VForm'

export default defineComponent({
  name: 'ParticipantWorks',
  computed: {
    PaperStatus() {
      return PaperStatus
    },
  },
  setup() {
    const showSnackbar = inject('showSnackbar') as (options: {
      message: string
      color?: string
    }) => void

    if (!showSnackbar) {
      console.error(
        'Snackbar injection failed. Please ensure it is provided in the AuthenticatedLayout.',
      )
    }

    const valid = ref(false)

    const paperStore = usePaperStore()
    const conferenceStore = useConferenceStore()
    const userStore = useUserStore()
    const categoryStore = useCategoryStore()
    const menuConfOpen = ref(false)
    const menuCatOpen = ref(false)
    const isDeleteDialogOpen = ref(false)
    const paperToDelete = ref<Paper | null>(null)

    const filters = reactive({
      selectedConference: '',
      selectedStatus: [] as readonly PaperStatus[],
    })

    const statusOptions = [
      PaperStatus.Draft,
      PaperStatus.Submitted,
      PaperStatus.UnderReview,
      PaperStatus.Accepted,
      PaperStatus.AcceptedWithChanges,
      PaperStatus.Rejected,
    ]

    const statusColors = {
      [PaperStatus.Draft]: 'grey',
      [PaperStatus.Submitted]: 'blue',
      [PaperStatus.UnderReview]: 'orange',
      [PaperStatus.Accepted]: 'green',
      [PaperStatus.AcceptedWithChanges]: 'primary',
      [PaperStatus.Rejected]: 'red',
    }

    const currentPaper = reactive<Partial<Paper & { file_link: File | null }>>({
      user: { first_name: '', last_name: '' },
      status: '',
      title: '',
      category: undefined as ActiveCategory | undefined,
      conference: undefined as ParticipantConference | undefined,
      abstract: '',
      keywords: [],
      authors: [] as Array<{ firstName: string; lastName: string }>,
      submission_date: '',
      file_link: undefined,
      deadline_date: '',
      isFinal: false,
    })

    const canEditPaper = (paper: Paper) => {
      //Allow editing only if the paper is in Draft status
      return paper.status === PaperStatus.Draft
    }

    const canViewReview = (paper: Paper) => {
      //Allow viewing review only if the paper has a review and is not in Draft
      return !!paper.review && paper.status !== PaperStatus.Draft
    }

    const isDeadlineEditable = (conference: ParticipantConference) => {
      //Disable the deadline edit button if the conference end_date has passed
      const now = new Date()
      const conferenceEndDate = new Date(conference.end_date || now) // Assuming conference.end_date exists
      return conferenceEndDate > now
    }

    const conferences = computed(() => {
      return conferenceStore.participantConferences.map(conference => ({
        ...conference,
        displayName: `${conference.year} - ${conference.location}: ${formatDate(conference.date)}`,
      }))
    })

    const selectedConference = computed(() =>
      currentPaper.conference && currentPaper.conference.date
        ? `${currentPaper.conference.year} - ${currentPaper.conference.location}: ${formatDate(currentPaper.conference.date)}`
        : ''
    );

    const selectedCategory = computed(() =>
      currentPaper.category ? `${currentPaper.category.name}` : '',
    )

    const user = userStore.userProfile
    const isDialogOpen = ref(false)
    const dialogMode = ref<'add' | 'edit' | 'view'>('add')

    const tableHeaders = [
      { title: '', key: 'actions' },
      { title: 'Status', key: 'status' },
      { title: 'Konferencia', key: 'conference.year' },
      { title: 'Názov práce', key: 'title' },
      { title: 'Vytvorenie', key: 'submission_date' },
      { title: '', key: 'buttons', sortable: false },
    ]

    const filteredPapers = computed(() =>
      paperStore.participantPapers.filter(
        paper =>
          (!filters.selectedConference ||
            paper.conference._id === filters.selectedConference) &&
          (!filters.selectedStatus.length ||
            filters.selectedStatus.includes(paper.status)),
      ),
    )

    const fetchDependencies = async () => {
      try {
        await Promise.all([
          conferenceStore.fetchParticipantConferences(),
          categoryStore.fetchParticipantCategories(),
          paperStore.getMyPapers(),
          userStore.fetchUserProfile(),
        ])

        paperStore.participantPapers = paperStore.participantPapers.map(
          paper => ({
            ...paper,
            conference: paper.conference || {
              year: 'Unknown',
              date: new Date(),
              location: 'Unkonwn',
            },
          }),
        )

        // Fetch the logged-in user's data
        const user = userStore.userProfile
        if (user) {
          currentPaper.authors = [
            {
              firstName: user.first_name,
              lastName: user.last_name,
            },
          ]
        } else {
          console.warn('Logged-in user profile is empty.')
        }
      } catch (error) {
        console.error('Failed to fetch dependencies:', error)
      }
    }

    const addAuthor = () => {
      if (!currentPaper.authors) {
        currentPaper.authors = []
      }
      currentPaper.authors.push({ firstName: '', lastName: '' })
    }

    const removeAuthor = (index: number) => {
      if (currentPaper.authors) {
        currentPaper.authors.splice(index, 1)
      }
    }

    const selectConference = (conference: ParticipantConference) => {
      if (conference) {
        currentPaper.conference = conference
        menuConfOpen.value = false
      } else {
        console.error('Invalid conference selected')
      }
    }

    const selectCategory = (category: ActiveCategory) => {
      currentPaper.category = { _id: category._id, name: category.name } as ActiveCategory;
      menuCatOpen.value = false;
    };

    const resetFilters = () => {
      filters.selectedConference = ''
      filters.selectedStatus = [] as PaperStatus[]
    }

    const form = ref<VForm | null>(null);

    const openDialog = (mode: 'add' | 'edit', paper: any = {}) => {
      dialogMode.value = mode

      if (mode === 'add') {
        Object.assign(currentPaper, {
          user: { first_name: '', last_name: '' },
          status: '',
          title: '',
          category: '',
          conference: '',
          abstract: '',
          keywords: [],
          authors: userStore.userProfile
            ? [
                {
                  firstName: userStore.userProfile.first_name,
                  lastName: userStore.userProfile.last_name,
                },
              ]
            : [],
          submission_date: '',
          file_link: undefined,
          deadline_date: '',
          isFinal: false,
        })
      } else {
        //Use the existing data
        Object.assign(currentPaper, paper)
      }

      isDialogOpen.value = true

      nextTick(() => {
        form.value?.validate();
      });
    }

    const closeDialog = () => {

      isDialogOpen.value = false;

      Object.assign(currentPaper, {
        status: '',
        title: '',
        category: undefined,
        conference: undefined,
        abstract: '',
        keywords: [],
        authors: userStore.userProfile
          ? [{ firstName: userStore.userProfile.first_name, lastName: userStore.userProfile.last_name }]
          : [],
        submission_date: '',
        file_link: undefined,
        deadline_date: '',
        isFinal: false,
      })
    }

    const savePaper = async () => {
      try {
        // Validate the file_link
        if (!currentPaper.file_link) {
          showSnackbar?.({
            message: 'Súbor je povinný pre uloženie práce.',
            color: 'error',
          })
          return
        }

        const payload = {
          title: currentPaper.title,
          abstract: currentPaper.abstract,
          keywords: currentPaper.keywords,
          isFinal: currentPaper.isFinal,
          status: currentPaper.status,
          conference: currentPaper.conference?._id,
          category: currentPaper.category?._id,
          authors: Array.isArray(currentPaper.authors)
            ? currentPaper.authors.map(author => ({
              firstName: author.firstName,
              lastName: author.lastName,
            }))
            : [],
        }

        if (dialogMode.value === 'edit' && currentPaper._id) {
          // Update existing paper
          await paperStore.updatePaper(
            currentPaper._id,
            payload,
            currentPaper.file_link,
          )
          showSnackbar?.({
            message: 'Práca bola úspešne upravená.',
            color: 'success',
          })

        } else {
          //Create new paper
          await paperStore.createPaper(payload, currentPaper.file_link)
          showSnackbar?.({
            message: 'Práca uložená ako koncept.',
            color: 'success',
          })
        }

        closeDialog();
      } catch (err) {
        console.error(err)
        showSnackbar?.({ message: 'Uloženie práce zlyhalo.', color: 'error' })
      }
    }

    const submitPaper = async () => {
      try {
        if (!currentPaper._id) {
          showSnackbar?.({
            message: 'Práca nemá ID. Uložiť ju najprv ako koncept.',
            color: 'error',
          })
          return
        }

        const payload = { status: PaperStatus.Submitted,  file_link: currentPaper.file_link }
        await paperStore.updatePaper(currentPaper._id, payload)

        showSnackbar?.({
          message: 'Práca bola úspešne odoslaná.',
          color: 'success',
        })
        closeDialog()
      } catch (err) {
        console.error(err)
        showSnackbar?.({
          message: 'Nepodarilo sa odoslať prácu.',
          color: 'error',
        })
      }
    }

    const viewReview = (paper: any) => {
      console.log('View review for', paper)
    }

    //Deletion of paper
    const confirmDeletePaper = (paper: Paper) => {
      paperToDelete.value = paper
      isDeleteDialogOpen.value = true
    }

    const deletePaper = async () => {
      if (!paperToDelete.value) return

      if (paperToDelete.value.status !== PaperStatus.Draft) {
        showSnackbar?.({
          message: 'Len koncepty môžu byť vymazané.',
          color: 'error',
        })
        return
      }

      try {
        await paperStore.deletePaper(paperToDelete.value._id)
        showSnackbar?.({
          message: 'Práca bola úspešne vymazaná.',
          color: 'success',
        })

        // Refresh the list of papers after deletion
        await paperStore.getMyPapers()
      } catch (err) {
        console.error('Failed to delete paper:', err)
        showSnackbar?.({
          message: 'Nepodarilo sa vymazať prácu.',
          color: 'error',
        })
      } finally {
        isDeleteDialogOpen.value = false
        paperToDelete.value = null
      }
    }

    // Computed properties
    const fileDownloadUrl = computed(() => {
      if (!currentPaper || !currentPaper.file_link) return "#";

      const apiBaseUrl = import.meta.env.VITE_API_URL; // Get API base URL

      if (currentPaper.file_link instanceof File) {
        // If it's a newly uploaded file, create a local URL
        return URL.createObjectURL(currentPaper.file_link);
      }

      // If it's a stored file path (string), append it to the backend URL
      return `${apiBaseUrl}${currentPaper.file_link}`;
    });

    watchEffect(() => {
      if (currentPaper.file_link instanceof File) {
        const objectUrl = URL.createObjectURL(currentPaper.file_link);
        return () => URL.revokeObjectURL(objectUrl);
      }
    });

    const getFileName = (file: string | File | undefined) => {
      if (!file) return "No file selected";

      if (file instanceof File) {
        return file.name; // Extract filename from File object
      }

      return file.split("/").pop(); // Extract filename from string path
    };


    const selectedFile = ref<File | null>(null);

    const handleFileSelection = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files[0]) {
        selectedFile.value = input.files[0];
      }
    }

    const formatDate = (date: Date | string | undefined | null) => {
      if (!date) return "N/A";

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        console.error("Invalid date value:", date);
        return "N/A";
      }

      return format(parsedDate, "dd.MM.yyyy");
    }

    const paperDetailsDialog = ref(false);
    const openPaperDetailsDialog = (paper: any) => {
      Object.assign(currentPaper, paper);
      paperDetailsDialog.value = true;
    }

    const downloadPaper = async (paper: any) => {
      if (!paper.conference?._id) {
        console.error("Conference ID is missing for paper:", paper);
        return;
      }

      await paperStore.downloadPaperReviewer(paper.conference._id, paper._id);
    }

    const isFormValid = computed(() => {
      return (
        !!currentPaper.title &&
        !!currentPaper.category &&
        !!currentPaper.conference &&
        !!(currentPaper.keywords && currentPaper.keywords.length > 0) &&
        !!currentPaper.abstract &&
        (!!currentPaper.file_link) // Check if file exists
      );
    });


    onMounted(() => {
      fetchDependencies()
    })

    return {
      valid,
      filters,
      paperStore,
      conferenceStore,
      categoryStore,
      statusOptions,
      tableHeaders,
      filteredPapers,
      isDialogOpen,
      dialogMode,
      currentPaper,
      statusColors,
      selectedConference,
      menuConfOpen,
      menuCatOpen,
      conferences,
      selectedCategory,
      user,
      isDeleteDialogOpen,
      fileDownloadUrl,
      paperDetailsDialog,
      isFormValid,
      downloadPaper,
      openPaperDetailsDialog,
      handleFileSelection,
      getFileName,
      canEditPaper,
      canViewReview,
      isDeadlineEditable,
      addAuthor,
      removeAuthor,
      selectCategory,
      selectConference,
      openDialog,
      closeDialog,
      savePaper,
      submitPaper,
      viewReview,
      resetFilters,
      confirmDeletePaper,
      deletePaper,
      formatDate,
    }
  },
})
</script>

<template>
  <v-card>
    <!-- Title Section -->
    <v-card-title>
      <div class="d-flex justify-space-between align-center w-100">
        <h3>Moje práce</h3>
        <v-btn color="primary" @click="openDialog('add')">
          <v-icon left class="add_icon">mdi-plus-circle-outline</v-icon> Pridať
          novú prácu
        </v-btn>
      </div>
    </v-card-title>

    <!-- Filters Section -->
    <v-card-subtitle>
      <v-row>
        <v-col cols="10" md="3">
          <v-text-field
            v-model="conferenceStore.filters.year"
            label="Filtrovať podľa roku"
            type="number"
            outlined
            dense
          />
        </v-col>
        <v-col cols="10" md="4">
          <v-select
            v-model="filters.selectedStatus"
            label="Filter by Status"
            :items="statusOptions"
            multiple
            outlined
            dense
          />
        </v-col>
        <v-col cols="8" md="3">
          <v-btn color="primary" small @click="resetFilters"
            >Zrušiť filter</v-btn
          >
        </v-col>
      </v-row>
    </v-card-subtitle>

    <!-- Data Table -->
    <v-data-table
      :headers="tableHeaders"
      :items="filteredPapers"
      :items-per-page="10"
      dense
      item-value="_id"
      class="custom-table"
    >
      <template v-slot:body="{ items }">
        <tr v-for="paper in items" :key="paper._id">
          <td>
            <v-icon
              size="30"
              color="primary"
              @click="openPaperDetailsDialog(paper)"
              style="cursor: pointer"
              v-if="paper.status != PaperStatus.Draft"
            >
              > mdi-eye
            </v-icon>
          </td>
          <td>
            <v-chip
              :color="statusColors[paper.status as keyof typeof statusColors]"
              outlined
              small
              class="d-flex justify-center custom-chip rounded"
            >
              {{ paper.status }}
            </v-chip>
          </td>
          <td>
            {{
              paper.conference
                ? `${paper.conference.year} - ${formatDate(paper.conference.date)}`
                : 'N/A'
            }}
          </td>
          <td>{{ paper.title }}</td>
          <td>{{ formatDate(paper.submission_date) }}</td>
          <td class="d-flex justify-end align-center">
            <v-btn
              :disabled="!canEditPaper(paper)"
              color="#FFCD16"
              @click="openDialog('edit', paper)"
              title="Upraviť"
            >
              <v-icon size="25">mdi-pencil</v-icon>
            </v-btn>
            <v-btn
              :disabled="!canViewReview(paper)"
              color="success"
              @click="viewReview"
              title="Ukazať recenziu"
            >
              <v-icon size="25" color="black">mdi-account-alert</v-icon>
            </v-btn>
            <v-btn
              :disabled="paper.status != PaperStatus.Draft"
              color="#BC463A"
              @click="confirmDeletePaper"
              title="Zmazať prácu"
            >
              <v-icon size="25">mdi-delete</v-icon>
            </v-btn>
          </td>
        </tr>
      </template>
    </v-data-table>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="isDialogOpen" max-width="800px">
      <v-card>
        <v-card-title>
          {{
            dialogMode === 'add'
              ? 'Pridať novú prácu'
              : dialogMode === 'edit'
                ? 'Upraviť prácu'
                : 'Podrobnosti o práci'
          }}
        </v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="valid">
            <v-text-field
              v-model="currentPaper.title"
              label="Názov"
              :rules="[() => !!currentPaper.title || 'Názov práce je povinný']"
              outlined
              dense
              class="large-text-field"
            />
            <v-menu
              v-model="menuCatOpen"
              close-on-content-click
              offset-y
              class="custom-menu"
            >
              <template v-slot:activator="{ props }">
                <v-text-field
                  v-bind="props"
                  label="Category"
                  v-model="selectedCategory"
                  outlined
                  dense
                  readonly
                  append-inner-icon="mdi-chevron-down"
                  class="large-text-field"
                  :rules="[() => !!currentPaper.category || 'Vyberte kategóriu']"
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
            <v-menu
              v-model="menuConfOpen"
              close-on-content-click
              offset-y
              class="custom-menu"
            >
              <template v-slot:activator="{ props }">

                <v-text-field
                  v-bind="props"
                  label="Conference"
                  v-model="selectedConference"
                  outlined
                  dense
                  readonly
                  append-inner-icon="mdi-chevron-down"
                  class="large-text-field"
                  :rules="[() => !!currentPaper.conference || 'Vyberte konferenciu']"
                />
              </template>
              <v-list>
                <v-list-item
                  v-for="conference in conferences"
                  :key="conference._id"
                  @click="selectConference(conference)"
                >
                  <v-list-item-title>
                    {{ conference.year }} - {{ conference.location }}:
                    {{ formatDate(conference.date) }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
            <!-- Keywords -->
            <v-text-field
              v-model="currentPaper.keywords"
              label="Kľúčové slová"
              placeholder="Vložte kľúčové slová oddelené čiarkou"
              outlined
              dense
              class="large-text-field"
              :rules="[() => !currentPaper.isFinal || !!currentPaper.keywords || 'Kľúčové slová sú povinné pre finálnu verziu']"            />
            <v-row>
              <v-col
                cols="12"
                v-for="(author, index) in currentPaper.authors"
                :key="index"
              >
                <v-row class="row_height">
                  <v-col cols="5" md="5">
                    <v-text-field
                      v-model="author.firstName"
                      label="Meno"
                      outlined
                      dense
                      class="flex-grow-1 large-text-field"
                      :disabled="dialogMode === 'view'"
                    />
                  </v-col>
                  <v-col cols="5" md="6">
                    <v-text-field
                      v-model="author.lastName"
                      label="Priezvisko"
                      outlined
                      dense
                      class="flex-grow-1 large-text-field"
                      :disabled="dialogMode === 'view'"
                    />
                  </v-col>
                  <v-col cols="2" md="1" class="d-flex justify-end">
                    <v-btn color="#BC463A" @click="removeAuthor(index)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-col>
              <v-col cols="12" class="d-flex justify-start author">
                <v-btn color="primary" @click="addAuthor">
                  <v-icon icon="mdi-plus-circle" start></v-icon>Ďalší
                  autor</v-btn
                >
              </v-col>
            </v-row>
            <!-- Abstract -->
            <v-textarea
              v-model="currentPaper.abstract"
              label="Abstrakt"
              outlined
              dense
              :rules="[() => !currentPaper.isFinal || !!currentPaper.abstract || 'Abstrakt je povinný pre finálnu verziu']"
              class="large-text-field"
            />
            <v-file-input
              v-model="currentPaper.file_link"
              label="Nahrajte súbor"
              outlined
              dense
              :disabled="dialogMode === 'view'"
              class="large-text-field"
              :rules="[() => !!currentPaper.file_link || 'Súbor je povinný']"
              @change="handleFileSelection"
            ></v-file-input>
            <!-- Show Existing File -->
            <p v-if="currentPaper && currentPaper.file_link">
              Aktuálny súbor:
              <a :href="fileDownloadUrl" target="_blank">{{ getFileName(currentPaper.file_link) }}</a>
            </p>
            <v-checkbox
              v-model="currentPaper.isFinal"
              color="red"
              label="Je toto finálna verzia? (Pre odovzdanie práce by malo byť zaškrtnuté)"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="closeDialog" color="#BC463A" variant="flat">Zrušiť</v-btn>
          <v-btn @click="savePaper" color="secondary" variant="flat">Uložiť</v-btn>
          <v-btn
            v-if="currentPaper.isFinal"
            @click="submitPaper"
            color="primary" variant="flat"
            :disabled="!isFormValid"
            >Odoslať</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Deletion dialog -->
    <v-dialog v-model="isDeleteDialogOpen" max-width="500px">
      <v-card>
        <v-card-title class="headline">Potvrdenie vymazania</v-card-title>
        <v-card-text>
          Ste si istý/istá, že chcete vymazať túto prácu? Táto akcia je
          nevratná.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="isDeleteDialogOpen = false"
            >Zrušiť</v-btn
          >
          <v-btn color="red" @click="deletePaper">Vymazať</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Paper Details Dialog -->
    <v-dialog v-model="paperDetailsDialog" max-width="800px">
      <v-card>
        <v-card-title>Detaily práce</v-card-title>
        <v-card-text>
          <v-table dense>
            <tbody>
            <tr>
              <td><strong>Názov:</strong></td>
              <td>{{ currentPaper?.title }}</td>
            </tr>
            <tr>
              <td><strong>Konferencia:</strong></td>
              <td>
                {{ currentPaper?.conference?.year }} -
                {{ formatDate(currentPaper?.conference?.date) }}
              </td>
            </tr>
            <tr>
              <td><strong>Sekcia:</strong></td>
              <td>{{ currentPaper?.category?.name }}</td>
            </tr>
            <tr>
              <td><strong>Kľúčové slová:</strong></td>
              <td>{{ currentPaper?.keywords?.join(', ') }}</td>
            </tr>
            <tr>
              <td><strong>Abstrakt:</strong></td>
              <td><em>{{ currentPaper?.abstract }}</em></td>
            </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="primary"
            @click="downloadPaper(currentPaper)">
            <v-icon size="36">mdi-download-box</v-icon>
            Stiahnuť
          </v-btn>
          <v-btn color="tertiary" @click="paperDetailsDialog = false"
          >Zrušiť</v-btn
          >
        </v-card-actions>

      </v-card>
    </v-dialog>
  </v-card>
</template>

<style lang="scss">
.author {
  margin-top: -20px;
  margin-bottom: 10px;
}

.row_height {
  margin-bottom: -30px;
}
</style>
