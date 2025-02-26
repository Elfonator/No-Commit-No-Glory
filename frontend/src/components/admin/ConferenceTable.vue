<script lang="ts">
import {
  defineComponent,
  ref,
  reactive,
  onMounted,
  computed,
  inject,
} from 'vue'
import { useConferenceStore } from '@/stores/conferenceStore'
import { useRouter } from 'vue-router'
import { format } from 'date-fns'
import { sk } from 'date-fns/locale'
import type { ConferenceAdmin } from '@/types/conference.ts'

export default defineComponent({
  name: 'ConferenceTable',
  setup() {
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

    // Initialize the conference store and router
    const conferenceStore = useConferenceStore()
    const router = useRouter()

    // Dialog and form state
    const isDialogOpen = ref(false)
    const isDeleteDialogOpen = ref(false)
    const dialogMode = ref<'add' | 'edit' | 'view'>('add')
    const currentConference = reactive<Partial<ConferenceAdmin>>({
      _id: '',
      status: '',
      year: new Date().getFullYear(),
      location: '',
      university: '',
      date: new Date(),
      start_date: new Date(),
      end_date: new Date(),
      deadline_submission: new Date(),
    })

    const statusOptions = ['Nadchádzajúca', 'Aktuálna', 'Ukončená', 'Zrušená']

    // Table headers
    const tableHeaders = [
      { title: '', value: 'view', sortable: false },
      { title: 'Stav', key: 'status' },
      { title: 'Rok', key: 'year' },
      { title: 'Univerzita', key: 'university' },
      { title: 'Začiatok', key: 'start_date' },
      { title: 'Koniec', key: 'end_date' },
      { title: 'Práce do', key: 'deadline_submission' },
      { title: '', value: 'actions', sortable: false },
    ]

    const openDialog = (
      mode: 'add' | 'edit' | 'view',
      conference: Partial<ConferenceAdmin> = {},
    ) => {
      dialogMode.value = mode

      //Convert date fields to Date objects if they are strings
      Object.assign(currentConference, {
        ...conference,
        date: conference.date ? new Date(conference.date) : new Date(),
        start_date: conference.start_date
          ? new Date(conference.start_date)
          : new Date(),
        end_date: conference.end_date
          ? new Date(conference.end_date)
          : new Date(),
        deadline_submission: conference.deadline_submission
          ? new Date(conference.deadline_submission)
          : new Date(),
      })

      isDialogOpen.value = true
    }

    const closeDialog = () => {
      isDialogOpen.value = false

      if (dialogMode.value === 'add') {
        Object.assign(currentConference, {
          _id: '',
          status: '',
          year: '',
          location: '',
          university: '',
          date: '',
          start_date: '',
          end_date: '',
          deadline_submission: '',
        })
      }
    }

    const saveConference = async () => {
      try {
        if (!currentConference.status || !currentConference.year) {
          showSnackbar?.({
            message: 'Vyplňte všetky povinné polia.',
            color: 'error',
          })
          return
        }

        if (dialogMode.value === 'add') {
          await conferenceStore.addConference(currentConference)
          showSnackbar?.({
            message: 'Konferencia bola úspešne pridaná.',
            color: 'success',
          })
        } else if (dialogMode.value === 'edit') {
          if ('_id' in currentConference && currentConference._id) {
            await conferenceStore.updateConference(
              currentConference._id,
              currentConference,
            )
            showSnackbar?.({
              message: 'Konferencia bola úspešne upravená.',
              color: 'success',
            })
          } else {
            console.error('Conference ID is missing for update.')
            showSnackbar?.({
              message: 'Pre aktualizáciu chýba ID konferencie.',
              color: 'error',
            })
          }
        }
        closeDialog()
      } catch (error) {
        console.error('Error saving conference:', error)
        showSnackbar?.({
          message: 'Nepodarilo sa uložiť konferenciu.',
          color: 'error',
        })
      }
    }
    /*
        // Delete confirmation handling
        const confirmDelete = (conference) => {
          Object.assign(currentConference, conference);
          isDeleteDialogOpen.value = true;
        };

        const closeDeleteDialog = () => {
          isDeleteDialogOpen.value = false;
        };

        const deleteConference = async () => {
          try {
            await conferenceStore.deleteConference(currentConference._id);
          } catch (error) {
            console.error("Error deleting conference:", error);
          } finally {
            closeDeleteDialog();
          }
        };
     */

    // View works for a specific conference
    const viewWorksForConference = (conference: any) => {
      router.push({
        name: 'ConferencePapers',
        //params: { conferenceId: conference._id },
      })
    }

    const formatTimestamp = (date: Date | string | null): string => {
      if (!date) return 'N/A'
      const parsedDate = typeof date === 'string' ? new Date(date) : date
      if (isNaN(parsedDate.getTime())) return 'N/A' // Check for invalid dates
      return format(parsedDate, 'dd.MM.yyyy', { locale: sk })
    }

    const menu = reactive({
      date: false,
      deadline_submission: false,
      start_date: false,
      end_date: false,
    })

    const formattedDialogForm = computed({
      get() {
        return {
          ...currentConference,
          date: currentConference.date
            ? format(currentConference.date, 'dd.MM.yyyy', { locale: sk })
            : '',
          deadline_submission: currentConference.deadline_submission
            ? format(currentConference.deadline_submission, 'dd.MM.yyyy', {
                locale: sk,
              })
            : '',
          start_date: currentConference.start_date
            ? format(currentConference.start_date, 'dd.MM.yyyy', { locale: sk })
            : '',
          end_date: currentConference.end_date
            ? format(currentConference.end_date, 'dd.MM.yyyy', { locale: sk })
            : '',
        }
      },
      set(newForm) {
        Object.assign(currentConference, {
          ...newForm,
          date: newForm.date ? new Date(newForm.date) : new Date(),
          deadline_submission: newForm.deadline_submission
            ? new Date(newForm.deadline_submission)
            : new Date(),
          start_date: newForm.start_date
            ? new Date(newForm.start_date)
            : new Date(),
          end_date: newForm.end_date ? new Date(newForm.end_date) : new Date(),
        })
      },
    })

    onMounted(() => {
      conferenceStore.fetchAdminConferences().then(() => {
        console.log('Fetched Conferences:', conferenceStore.adminConferences)
      })
    })

    return {
      conferenceStore,
      isDialogOpen,
      isDeleteDialogOpen,
      dialogMode,
      currentConference,
      statusOptions,
      tableHeaders,
      formattedDialogForm,
      menu,
      openDialog,
      closeDialog,
      saveConference,
      //confirmDelete,
      //closeDeleteDialog,
      //deleteConference,
      viewWorksForConference,
      formatTimestamp,
    }
  },
})
</script>

<template>
  <v-card>
    <v-card-title>
      <div class="d-flex justify-space-between align-center w-100">
        <h3>Konferencie</h3>
        <v-btn color="primary" class="add_new" @click="openDialog('add')"
          ><v-icon left class="add_icon">mdi-plus-circle-outline</v-icon>Pridať
          konferenciu</v-btn
        >
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
        <v-col cols="10" md="3">
          <v-text-field
            v-model="conferenceStore.filters.university"
            label="Filtrovať podľa univerzity"
            outlined
            dense
          />
        </v-col>
        <v-col cols="10" md="3">
          <v-select
            v-model="conferenceStore.filters.selectedStatus"
            :items="statusOptions"
            label="Stav"
            outlined
            dense
            multiple
          />
        </v-col>
        <v-col cols="8" md="2">
          <v-btn color="primary" small @click="conferenceStore.resetFilters"
            >Zrušiť filter</v-btn
          >
        </v-col>
      </v-row>
    </v-card-subtitle>

    <!-- Data Table -->
    <v-data-table
      :headers="tableHeaders"
      :items="conferenceStore.filteredConferences"
      :items-per-page="10"
      :pageText="'{0}-{1} z {2}'"
      items-per-page-text="Konferencie na stránku"
      item-value="_id"
      dense
      class="custom-table"
    >
      <template v-slot:body="{ items }">
        <tr
          v-for="conference in items"
          :key="conference._id"
          class="custom-row"
        >
          <td>
            <v-icon
              size="24"
              color="primary"
              @click="openDialog('view', conference)"
              style="cursor: pointer"
            >
              mdi-eye
            </v-icon>
          </td>
          <td>
            <v-chip
              :color="
                conference.status === 'Aktuálna'
                  ? 'green'
                  : conference.status === 'Nadchádzajúca'
                    ? '#E7B500'
                    : conference.status === 'Ukončená'
                      ? 'red'
                      : 'grey'
              "
              outlined
              small
              class="d-flex justify-center custom-chip rounded"
            >
              {{ conference.status }}
            </v-chip>
          </td>
          <td>{{ conference.year }}</td>
          <td>{{ conference.university }}</td>
          <td>{{ formatTimestamp(conference.start_date) }}</td>
          <td>{{ formatTimestamp(conference.end_date) }}</td>
          <td>{{ formatTimestamp(conference.deadline_submission) }}</td>
          <td class="d-flex justify-end align-center">
            <v-btn
              color="#FFCD16"
              title="Edit"
              @click="openDialog('edit', conference)"
            >
              <v-icon size="24">mdi-pencil</v-icon>
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
              ? 'Pridať konferenciu'
              : dialogMode === 'edit'
                ? 'Upraviť konferenciu'
                : 'Detail konferencie'
          }}
        </v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="currentConference.status"
                  :items="statusOptions"
                  label="Stav"
                  outlined
                  dense
                  class="large-text-field"
                  :rules="[v => !!v || 'Stav je povinný']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="currentConference.year"
                  label="Rok"
                  outlined
                  dense
                  type="number"
                  required
                  class="large-text-field"
                  :rules="[
                v => !!v || 'Rok je povinný',
                v => v > 0 || 'Rok musí byť kladné číslo',
              ]"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-menu
                  v-model="menu.date"
                  :close-on-content-click="false"
                  transition="scale-transition"
                  attach
                >
                  <template v-slot:activator="{ props }">
                    <v-text-field
                      v-model="formattedDialogForm.date"
                      label="Dátum konferencie"
                      readonly
                      dense
                      outlined
                      v-bind="props.attrs"
                      v-on="props.on"
                      append-inner-icon="mdi-calendar"
                      @click:append-inner="menu.date = true"
                      class="large-text-field"
                      :disabled="dialogMode === 'view'"
                    />
                  </template>
                  <v-date-picker
                    v-model="currentConference.date"
                    @accept="menu.date = false"
                    :color="'primary'"
                  />
                </v-menu>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="currentConference.university"
                  label="Univerzita"
                  outlined
                  dense
                  class="large-text-field"
                  :disabled="dialogMode === 'view'"
                  :rules="[v => !!v || 'Univerzita je povinná']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="currentConference.location"
                  label="Miesto"
                  outlined
                  dense
                  class="large-text-field"
                  :disabled="dialogMode === 'view'"
                  :rules="[v => !!v || 'Miesto konania je povinné']"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-menu
                  v-model="menu.deadline_submission"
                  :close-on-content-click="false"
                  transition="scale-transition"
                  attach
                  :disabled="dialogMode === 'view'"
                >
                  <template v-slot:activator="{ props }">
                    <v-text-field
                      v-model="formattedDialogForm.deadline_submission"
                      label="Deadline"
                      readonly
                      dense
                      outlined
                      v-bind="props.attrs"
                      v-on="props.on"
                      append-inner-icon="mdi-calendar"
                      @click:append-inner="menu.deadline_submission = true"
                      class="large-text-field"
                      :disabled="dialogMode === 'view'"
                    />
                  </template>
                  <v-date-picker
                    v-model="currentConference.deadline_submission"
                    @accept="menu.deadline_submission = false"
                    :color="'primary'"
                  />
                </v-menu>
              </v-col>
              <v-col cols="12" md="6">
                <v-menu
                  v-model="menu.start_date"
                  :close-on-content-click="false"
                  transition="scale-transition"
                  attach
                >
                  <template v-slot:activator="{ props }">
                    <v-text-field
                      v-model="formattedDialogForm.start_date"
                      label="Začiatok konferencie"
                      readonly
                      dense
                      outlined
                      v-bind="props.attrs"
                      v-on="props.on"
                      append-inner-icon="mdi-calendar"
                      @click:append-inner="menu.start_date = true"
                      class="large-text-field"
                      :disabled="dialogMode === 'view'"
                    />
                  </template>
                  <v-date-picker
                    v-model="currentConference.start_date"
                    @accept="menu.start_date = false"
                    :color="'primary'"
                  />
                </v-menu>
              </v-col>
              <v-col cols="12" md="6">
                <v-menu
                  v-model="menu.end_date"
                  :close-on-content-click="false"
                  transition="scale-transition"
                  attach
                >
                  <template v-slot:activator="{ props }">
                    <v-text-field
                      v-model="formattedDialogForm.end_date"
                      label="Koniec konferencie"
                      readonly
                      dense
                      outlined
                      v-bind="props.attrs"
                      v-on="props.on"
                      append-inner-icon="mdi-calendar"
                      @click:append-inner="menu.end_date = true"
                      class="large-text-field"
                      :disabled="dialogMode === 'view'"
                    />
                  </template>
                  <v-date-picker
                    v-model="currentConference.end_date"
                    @accept="menu.end_date = false"
                    :color="'primary'"
                  />
                </v-menu>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn color="secondary" @click="closeDialog">Zrušiť</v-btn>
          <v-btn
            v-if="dialogMode !== 'view'"
            color="primary"
            @click="saveConference"
            >Uložiť</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style lang="scss">
.v-menu {
  display: flex;
  justify-content: center;
  margin-top: 100px;
}
</style>
