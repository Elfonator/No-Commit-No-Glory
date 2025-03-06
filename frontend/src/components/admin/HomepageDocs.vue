<script lang="ts">
import { defineComponent, ref, reactive, inject } from 'vue'

export default defineComponent({
  name: 'DocumentTable',
  setup() {
    const showSnackbar = inject('showSnackbar') as (({
                                                       message,
                                                       color,
                                                     }: {
      message: string
      color?: string
    }) => void)

    if (!showSnackbar) {
      console.error('showSnackbar is not provided')
    }

    // Temporary data for documents
    const documents = ref([
      { id: '1', name: 'Dokument 2023', year: '2023', fileName: '', file: null },
      { id: '2', name: 'Dokument 2022', year: '2022', fileName: '', file: null },
      { id: '3', name: 'Dokument 2021', year: '2021', fileName: '', file: null },
    ])

    // States for handling the modal and form data
    const isDialogOpen = ref(false)
    const dialogMode = ref<'add' | 'edit'>('add')
    const currentDocument = reactive({ id: '', name: '', year: '', file: null as File | null, fileName: '' })
    const valid = ref(false)

    // Table headers
    const headers = [
      { title: 'Názov dokumentu', key: 'name' },
      { title: 'Rok', key: 'year' },
      { title: 'Názov súboru', key: 'fileName' },
      { title: '', value: 'actions', sortable: false },
    ]

    // Open the dialog for adding or editing a document
    const openDialog = (
      mode: 'add' | 'edit',
      document = { id: '', name: '', year: '', file: null as File | null, fileName: '' }
    ) => {
      dialogMode.value = mode
      Object.assign(currentDocument, document)
      isDialogOpen.value = true
    }

    // Close the dialog
    const closeDialog = () => {
      isDialogOpen.value = false
      Object.assign(currentDocument, { id: '', name: '', year: '', file: null, fileName: '' })
    }

    // Save the document (add or update)
    const saveDocument = async () => {
      try {
        if (dialogMode.value === 'add') {
          // Add new document to the temporary data
          documents.value.push({
            id: (documents.value.length + 1).toString(),
            name: currentDocument.name,
            year: currentDocument.year,
            fileName: currentDocument.file ? currentDocument.file.name : '',
            file: currentDocument.file,
          })
          showSnackbar?.({
            message: 'Dokument bol úspešne pridaný.',
            color: 'success',
          })
        } else {
          // Update existing document
          const index = documents.value.findIndex((doc) => doc.id === currentDocument.id)
          if (index !== -1) {
            documents.value[index] = {
              ...documents.value[index],
              name: currentDocument.name,
              year: currentDocument.year,
              fileName: currentDocument.file ? currentDocument.file.name : documents.value[index].fileName,
              file: currentDocument.file,  // Update file
            }
          }
          showSnackbar?.({
            message: 'Dokument bol úspešne aktualizovaný.',
            color: 'success',
          })
        }
        closeDialog()
      } catch (error) {
        console.error('Error saving document:', error)
        showSnackbar?.({
          message: 'Nepodarilo sa uložiť dokument.',
          color: 'error',
        })
      }
    }

    // Delete the document
    const deleteDocument = async (documentId: string) => {
      try {
        // Remove document from the temporary data
        documents.value = documents.value.filter(doc => doc.id !== documentId)
        showSnackbar?.({
          message: 'Dokument bol úspešne odstránený.',
          color: 'success',
        })
      } catch (error) {
        console.error('Error deleting document:', error)
        showSnackbar?.({
          message: 'Nepodarilo sa odstrániť dokument.',
          color: 'error',
        })
      }
    }

    return {
      documents,
      isDialogOpen,
      dialogMode,
      currentDocument,
      valid,
      headers,
      openDialog,
      closeDialog,
      saveDocument,
      deleteDocument,
    }
  },
})
</script>

<template>
  <v-card>
    <v-card-title>
      <div class="d-flex justify-space-between align-center w-100">
        <h3>Správa dokumentov</h3>
        <v-btn color="primary" @click="openDialog('add')">
          <v-icon left>mdi-plus-circle-outline</v-icon>Pridať dokument
        </v-btn>
      </div>
    </v-card-title>

    <v-data-table
      :headers="headers"
      :items="documents"
      class="custom-table"
      :page-text="'{0}-{1} z {2}'"
      items-per-page-text="Dokumenty na stránku"
    >
      <template v-slot:body="{ items }">
        <tr v-for="document in items" :key="document.id">
          <td>{{ document.name }}</td>
          <td>{{ document.year }}</td>
          <td>{{ document.fileName || 'No file uploaded' }}</td>
          <td class="d-flex justify-end align-center">
            <v-btn color="#FFCD16" @click="openDialog('edit', document)">
              <v-icon size="24">mdi-pencil</v-icon>
            </v-btn>
            <v-btn color="#BC463A" @click="deleteDocument(document.id)">
              <v-icon size="24" color="white">mdi-delete</v-icon>
            </v-btn>
          </td>
        </tr>
      </template>
    </v-data-table>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="isDialogOpen" max-width="800px">
      <v-card>
        <v-card-title>{{ dialogMode === 'add' ? 'Pridať dokument' : 'Upraviť dokument' }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef" v-model="valid">
            <v-text-field
              v-model="currentDocument.name"
              label="Názov dokumentu"
              outlined
              :rules="[v => !!v || 'Názov dokumentu je povinný']"
            />
            <v-text-field
              v-model="currentDocument.year"
              label="Rok"
              type="number"
              outlined
              :rules="[v => !!v || 'Rok je povinný']"
            />
            <v-file-input
              v-model="currentDocument.file"
              label="Vyberte súbor"
              accept=".pdf,.docx,.txt"
              outlined
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn color="secondary" @click="closeDialog">Zrušiť</v-btn>
          <v-btn :disabled="!valid" color="primary" @click="saveDocument">
            {{ dialogMode === 'add' ? 'Pridať' : 'Uložiť' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>


<style scoped>

</style>
