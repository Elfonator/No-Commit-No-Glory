<script lang="ts">
import { defineComponent, ref, reactive, onMounted, inject } from 'vue'
import { useHomepageStore } from '@/stores/homepageStore'

export default defineComponent({
  name: 'DocumentTable',
  setup() {
    const homepageStore = useHomepageStore()
    const documents = ref(homepageStore.conferenceDocsAdmin || [])
    const isDialogOpen = ref(false)
    const dialogMode = ref<'add' | 'edit'>('add')
    const valid = ref(false)

    const showSnackbar = inject('showSnackbar') as ({
                                                      message,
                                                      color,
                                                    }: {
      message: string
      color?: string
    }) => void


    const headers = [
      { title: 'Konferencia', key: 'conference' },
      { title: 'Ocenené', key: 'awarded' },
      { title: 'Publikované', key: 'published' },
      { title: 'Zborník', key: 'collection' },
      { title: 'ISBN', key: 'isbn' },
      { title: '', value: 'actions', sortable: false },
    ]

    const currentDocument = reactive({
      id: '',
      conference: '',
      isbn: '',
      awarded: null as File | null,
      published: null as File | null,
      collection: null as File | null,
    })

    const openDialog = (mode: 'add' | 'edit', doc: any = null) => {
      dialogMode.value = mode
      if (doc) {
        Object.assign(currentDocument, {
          id: doc._id,
          conference: doc.conference,
          isbn: doc.isbn,
          existingAwardedName: doc.awarded?.split("/").pop() || null,
          existingPublishedName: doc.published?.split("/").pop() || null,
          existingCollectionName: doc.collection?.split("/").pop() || null,
        })
      } else {
        Object.assign(currentDocument, {
          id: '',
          conference: '',
          isbn: '',
          awarded: null,
          published: null,
          collection: null,
        })
      }
      isDialogOpen.value = true
    }

    const closeDialog = () => {
      isDialogOpen.value = false
    }

    const saveDocument = async () => {
      try {
        const formData = new FormData()
        formData.append('conference', currentDocument.conference)
        if( currentDocument.isbn) formData.append('isbn', currentDocument.isbn)
        if (currentDocument.awarded) formData.append('awarded', currentDocument.awarded)
        if (currentDocument.published) formData.append('published', currentDocument.published)
        if (currentDocument.collection) formData.append('collection', currentDocument.collection)

        await homepageStore.uploadConferenceDocuments(formData)
        await homepageStore.fetchConferenceDocuments()

        showSnackbar?.({
          message: 'Dokumenty boli úspešne uložené.',
          color: 'success',
        })

        closeDialog()
      } catch (error) {
        showSnackbar?.({
          message: 'Nepodarilo sa uložiť dokumenty.',
          color: 'error',
        })
        console.error(error)
      }
    }

    // Delete the document
    const deleteDocument = async (documentId: string) => {
      try {
        // Remove document from the temporary data
        documents.value = documents.value.filter(doc => doc._id !== documentId)
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

    onMounted(async () => {
      await homepageStore.fetchConferenceDocuments()
      documents.value = homepageStore.conferenceDocsAdmin
    })

    return {
      documents,
      currentDocument,
      isDialogOpen,
      dialogMode,
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
        <h3>Dokumenty starších konferencií</h3>
        <v-btn color="primary" @click="openDialog('add')">
          <v-icon left>mdi-plus-circle-outline</v-icon>
          Pridať dokument
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
        <tr v-for="doc in items" :key="doc.conference">
          <td>{{ doc.conference }}</td>
          <td>{{ doc.awarded?.split('/').pop() || '-' }}</td>
          <td>{{ doc.published?.split('/').pop() || '-' }}</td>
          <td>{{ doc.collection?.split('/').pop() || '-' }}</td>
          <td>{{ doc.isbn }}</td>
          <td class="d-flex justify-end align-center">
            <v-btn color="#FFCD16" @click="openDialog('edit', doc)">
              <v-icon size="24">mdi-pencil</v-icon>
            </v-btn>
            <v-btn color="#BC463A" @click="deleteDocument(doc._id)">
              <v-icon size="24" color="white">mdi-delete</v-icon>
            </v-btn>
          </td>
        </tr>
      </template>
    </v-data-table>

    <!-- Dialog -->
    <v-dialog v-model="isDialogOpen" max-width="700px">
      <v-card>
        <v-card-title>
          {{ dialogMode === 'add' ? 'Pridať dokumenty' : 'Upraviť dokumenty' }}
        </v-card-title>
        <v-card-text>
          <v-form v-model="valid">
            <v-text-field
              v-model="currentDocument.conference"
              label="Konferencia (napr. ŠVK 2023)"
              outlined
              required
              :rules="[v => !!v || 'Toto pole je povinné']"
            />
            <v-file-input
              v-model="currentDocument.awarded"
              label="Ocenené práce"
              accept=".pdf"
              outlined
            />
            <v-file-input
              v-model="currentDocument.published"
              label="Publikované práce"
              accept=".pdf"
              outlined
            />
            <v-file-input
              v-model="currentDocument.collection"
              label="Zborník recenzovaných príspevkov"
              accept=".pdf"
              outlined
            />
            <v-text-field
              v-model="currentDocument.isbn"
              label="ISBN"
              outlined
              required
              :rules="[
    v => !!v || 'ISBN je povinné',
    v => /^97[89]-\d{2}-\d{3}-\d{4}-\d{1}$/.test(v) || 'Zadajte platné ISBN v tvare 978-XX-XXX-XXXX-X'
  ]"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="tonal" color="#BC463A" @click="closeDialog">Zrušiť</v-btn>
          <v-btn variant="tonal" color="primary" :disabled="!valid" @click="saveDocument">
            Uložiť
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style lang="scss">

</style>
