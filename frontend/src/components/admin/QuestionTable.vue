<script lang="ts">
import {
  defineComponent,
  ref,
  computed,
  onMounted,
  inject,
  reactive,
} from 'vue'
import { useQuestionStore } from '@/stores/questionStore'
import type { Question } from '@/types/question.ts'

export default defineComponent({
  name: 'QuestionTable',
  setup() {
    //Access the global showSnackbar function
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

    const valid = ref(false)

    const questionStore = useQuestionStore()
    const currentQuestion = reactive({
      _id: '',
      text: '',
      type: '',
      category: '',
    })
    const isDeleteDialogOpen = ref(false)

    //State for filters and dialog
    const filters = ref({
      text: '',
      type: [] as string[],
      category: [] as string[],
    })

    const currentPage = ref(1)
    const perPage = ref(10)
    const dialogVisible = ref(false)
    const dialogMode = ref<'add' | 'edit'>('add')
    const dialogForm = ref<Question>({
      _id: '',
      text: '',
      type: 'text',
      options: {
        min: 1,
        max: 6,
      },
      category: '',
    })

    const typeOptions = [
      { text: 'Textová otázka', value: 'text' },
      { text: 'Hodnotenie', value: 'rating' },
      { text: 'Áno/Nie', value: 'yes_no' },
    ]

    const categoryOptions = [
      { text: 'Dodržiavanie pravidiel', value: 'Dodržiavanie pravidiel' },
      { text: 'Hodnotenie', value: 'Hodnotenie' },
      { text: 'Obsah práce', value: 'Obsah práce' },
      { text: 'Štruktúra práce', value: 'Štruktúra práce' },
    ]

    const questionLabels = {
      rating: 'Hodnotenie',
      text: 'Text',
      yes_no: 'Áno/Nie',
    }

    const tableHeaders = [
      { title: 'Text', value: 'text' },
      { title: 'Typ', value: 'type' },
      { title: 'Kategória', value: 'category' },
      { title: '', value: 'actions' },
    ]

    //Computed filtered questions
    const filteredQuestions = computed(() =>
      questionStore.adminQuestions.filter(question => {
        const matchesText =
          !filters.value.text ||
          question.text.toLowerCase().includes(filters.value.text.toLowerCase())
        const matchesType =
          !filters.value.type.length ||
          filters.value.type.includes(question.type)
        const matchesCategory =
          !filters.value.category.length ||
          filters.value.category.includes(question.category)
        return matchesText && matchesType && matchesCategory
      }),
    )

    //Dialog handling
    const openDialog = (mode: 'add' | 'edit', question: any = null) => {
      dialogMode.value = mode
      dialogVisible.value = true

      if (mode === 'add') {
        dialogForm.value = {
          _id: '',
          text: '',
          type: 'text',
          category: '',
        }
      } else if (question) {
        dialogForm.value = { ...question }
      }
    }

    const closeDialog = () => {
      dialogVisible.value = false
    }

    const submitDialogForm = async () => {
      try {
        if (dialogMode.value === 'add') {
          await questionStore.addQuestion(dialogForm.value)
          showSnackbar?.({
            message: 'Otázka bola úspešne pridaná.',
            color: 'success',
          })
        } else {
          await questionStore.updateQuestion(
            dialogForm.value._id,
            dialogForm.value,
          )
          showSnackbar?.({
            message: 'Otázka bola úspešne upravená.',
            color: 'success',
          })
        }
        closeDialog()
      } catch (error) {
        console.error('Error saving question:', error)
        showSnackbar?.({
          message: 'Nepodarilo sa uložiť otázku.',
          color: 'error',
        })
      }
    }

    const resetFilters = () => {
      filters.value = { text: '', type: [], category: [] }
    }

    // Delete confirmation handling
    const confirmDelete = (question: {
      _id: string
      text: string
      type: string
      category: string
    }) => {
      Object.assign(currentQuestion, question)
      isDeleteDialogOpen.value = true
    }

    const closeDeleteDialog = () => {
      isDeleteDialogOpen.value = false
    }

    const deleteQuestion = async () => {
      try {
        await questionStore.deleteQuestion(currentQuestion._id)
        showSnackbar?.({
          message: 'Otázka bola úspešne odstránená.',
          color: 'success',
        })
      } catch (error) {
        console.error('Error deleting question:', error)
        showSnackbar?.({
          message: 'Nepodarilo sa odstrániť otázku.',
          color: 'error',
        })
      } finally {
        closeDeleteDialog()
      }
    }

    // Fetch questions on mount
    onMounted(() => {
      questionStore.fetchAllQuestions().catch(error => {
        console.error('Error fetching questions:', error)
        showSnackbar?.({
          message: 'Nepodarilo sa načítať otázky.',
          color: 'error',
        })
      })
    })

    return {
      valid,
      filters,
      currentPage,
      perPage,
      dialogVisible,
      dialogMode,
      dialogForm,
      typeOptions,
      categoryOptions,
      questionLabels,
      tableHeaders,
      filteredQuestions,
      isDeleteDialogOpen,
      confirmDelete,
      closeDeleteDialog,
      deleteQuestion,
      openDialog,
      closeDialog,
      submitDialogForm,
      resetFilters,
    }
  },
})
</script>

<template>
  <v-card>
    <v-card-title>
      <div class="d-flex justify-space-between align-center w-100">
        <h3>Správa Otázok</h3>
        <v-btn color="primary" class="add_new" @click="openDialog('add')">
          <v-icon left class="add_icon">mdi-plus-circle-outline</v-icon>
          Pridať Otázku
        </v-btn>
      </div>
    </v-card-title>

    <v-card-subtitle>
      <v-row>
        <v-col cols="12" md="3">
          <v-select
            v-model="filters.type"
            :items="typeOptions"
            label="Typ otázky"
            item-title="text"
            item-value="value"
            multiple
            outlined
            dense
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="filters.category"
            :items="categoryOptions"
            label="Kategória"
            item-title="text"
            item-value="value"
            multiple
            outlined
            dense
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-btn color="primary" small @click="resetFilters"
            >Zrušiť filter</v-btn
          >
        </v-col>
      </v-row>
    </v-card-subtitle>

    <v-data-table
      :headers="tableHeaders"
      :items="filteredQuestions"
      :items-per-page="perPage"
      :page.sync="currentPage"
      class="custom-table"
      dense
      item-value="_id"
    >
      <template v-slot:body="{ items }">
        <tr v-for="question in items" :key="question._id" class="custom-row">
          <td>{{ question.text }}</td>
          <td>
            <v-chip
              color="primary"
              dark
              small
              class="d-flex justify-center custom-chip rounded"
            >
              <td>
                {{
                  questionLabels[
                    question.type as keyof typeof questionLabels
                  ] || 'Neznámy typ'
                }}
              </td>
            </v-chip>
          </td>
          <td>
            <v-chip
              color="brown"
              dark
              small
              class="d-flex justify-center custom-chip rounded"
            >
              {{ question.category || 'N/A' }}
            </v-chip>
          </td>
          <td class="d-flex justify-end align-center">
            <v-btn color="#FFCD16" @click="openDialog('edit', question)">
              <v-icon size="24">mdi-pencil</v-icon>
            </v-btn>
            <v-btn color="#BC463A" @click="confirmDelete(question)">
              <v-icon size="24" color="white">mdi-delete</v-icon>
            </v-btn>
          </td>
        </tr>
      </template>
    </v-data-table>

    <!-- Dialog -->
    <v-dialog v-model="dialogVisible" max-width="800px">
      <v-card>
        <v-card-title>
          {{ dialogMode === 'add' ? 'Pridať Otázku' : 'Upraviť Otázku' }}
        </v-card-title>
        <v-card-text>
          <v-form v-model="valid">
            <v-text-field
              v-model="dialogForm.text"
              label="Text otázky"
              outlined
              dense
              :rules="[v => !!v || 'Text otázky je povinný']"
            />
            <v-select
              v-model="dialogForm.type"
              :items="typeOptions"
              label="Typ otázky"
              item-title="text"
              outlined
              dense
              :rules="[v => !!v || 'Vyberte typ otázky']"
            />
            <v-select
              v-model="dialogForm.category"
              :items="categoryOptions"
              label="Kategória"
              item-title="text"
              outlined
              dense
              :rules="[v => !!v || 'Vyberte kategóriu']"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="outlined" color="#BC463A" @click="closeDialog">Zrušiť</v-btn>
          <v-btn variant="outlined" :disabled="!valid" color="primary" @click="submitDialogForm">Uložiť</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="isDeleteDialogOpen" max-width="500px">
      <v-card>
        <v-card-title>Potvrdenie odstránenia</v-card-title>
        <v-card-text>
          <p>Ste si istí, že chcete odstrániť ?</p>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="outlined" color="primary" @click="closeDeleteDialog">Zrušiť</v-btn>
          <v-btn variant="outlined" color="#BC463A" @click="deleteQuestion">Odstrániť</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style lang="scss"></style>
