<script lang="ts">
import { defineComponent, ref, reactive } from 'vue'

export default defineComponent({
  name: 'ConferenceCommittee',
  setup() {
    // Show snackbar function (temporary)
    const showSnackbar = (message: string, color: string) => {
      console.log(message, color)
    }

    type Committee = {
      name: string
      university: 'UKF' | 'UMB' | 'UCM'
    }

    // Dialog states
    const isDialogOpen = ref(false)
    const dialogMode = ref<'add' | 'edit'>('add')
    const currentMember = reactive<Committee>({
      name: '',
      university: 'UKF', // Default to 'UKF'
    })

    // Committees data (array of members with university property)
    const committees = reactive<Committee[]>([
      { name: 'prof. RNDr. Radoslav Omelka, PhD.', university: 'UKF' },
      { name: 'PaedDr. Katarína Zverková', university: 'UKF' },
      { name: 'doc. RNDr. Ingrid Turisová, PhD.', university: 'UMB' },
      { name: 'Mgr. Dominika Vešelényiová, PhD.', university: 'UCM' },
    ])

    // Headers for the table
    const headers = [
      { text: 'Meno', value: 'name' },
      { text: 'Univerzita', value: 'university' },
      { text: 'Akcie', value: 'actions', sortable: false },
    ]

    // Open Dialog for Add/Edit
    const openDialog = (mode: 'add' | 'edit', member: { name: string, university: string } = { name: '', university: 'UKF' }) => {
      dialogMode.value = mode
      Object.assign(currentMember, member)
      isDialogOpen.value = true
    }

    // Close the dialog
    const closeDialog = () => {
      isDialogOpen.value = false
      currentMember.name = ''
      currentMember.university = 'UKF' // Reset to default university
    }

    // Save/Add Member
    const saveMember = () => {
      const member: Committee = { name: currentMember.name, university: currentMember.university }

      if (dialogMode.value === 'add') {
        committees.push(member)
        showSnackbar('Člen úspešne pridaný.', 'success')
      } else {
        const index = committees.findIndex(m => m.name === currentMember.name && m.university === currentMember.university)
        if (index !== -1) {
          committees[index] = member
        }
        showSnackbar('Člen úspešne upravený.', 'success')
      }
      closeDialog()
    }

    // Delete Member
    const deleteMember = (member: { name: string, university: string }) => {
      const index = committees.findIndex(m => m.name === member.name && m.university === member.university)
      if (index !== -1) {
        committees.splice(index, 1)
      }
      showSnackbar('Člen úspešne odstránený.', 'success')
    }

    // Filter members by university
    const getMembersByUniversity = (university: 'UKF' | 'UMB' | 'UCM') => {
      return committees.filter(member => member.university === university)
    }

    return {
      committees,
      isDialogOpen,
      dialogMode,
      currentMember,
      headers,
      openDialog,
      closeDialog,
      saveMember,
      deleteMember,
      getMembersByUniversity,
    }
  },
})
</script>

<template>
  <v-card>
    <v-card-title>
      <div class="d-flex justify-space-between align-center w-100">
        <h3>Organizačný výbor konferencie</h3>
        <v-btn color="primary" @click="openDialog('add')">
          <v-icon left>mdi-plus-circle-outline</v-icon>Pridať člena
        </v-btn>
      </div>
    </v-card-title>
  </v-card>

  <!-- Data Table for UKF University -->
  <v-row>
    <v-col cols="12">
      <v-card>
        <v-card-title><h4>FPVaI UKF v Nitre:</h4></v-card-title>
        <v-data-table
          :headers="headers"
          :items="getMembersByUniversity('UKF')"
          class="custom-table"
          :page-text="'{0}-{1} z {2}'"
          items-per-page-text="Členovia na stránku"
        >
          <template v-slot:body="{ items }">
            <tr v-for="member in items" :key="member.name">
              <td>{{ member.name }}</td>
              <td class="d-flex justify-end align-center">
                <v-btn color="#FFCD16" @click="openDialog('edit', member)">
                  <v-icon size="24">mdi-pencil</v-icon>
                </v-btn>
                <v-btn color="#BC463A" @click="deleteMember(member)">
                  <v-icon size="24" color="white">mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card>
    </v-col>
  </v-row>

  <!-- Data Table for UMB University -->
  <v-row>
    <v-col cols="12">
      <v-card>
        <v-card-title><h4>FPV UMB v Banskej Bystrici</h4></v-card-title>
        <v-data-table
          :headers="headers"
          :items="getMembersByUniversity('UMB')"
          class="custom-table"
          :page-text="'{0}-{1} z {2}'"
          items-per-page-text="Členovia na stránku"
        >
          <template v-slot:body="{ items }">
            <tr v-for="member in items" :key="member.name">
              <td>{{ member.name }}</td>
              <td class="d-flex justify-end align-center">
                <v-btn color="#FFCD16" @click="openDialog('edit', member)">
                  <v-icon size="24">mdi-pencil</v-icon>
                </v-btn>
                <v-btn color="#BC463A" @click="deleteMember(member)">
                  <v-icon size="24" color="white">mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card>
    </v-col>
  </v-row>

  <!-- Data Table for UCM University -->
  <v-row>
    <v-col cols="12">
      <v-card>
        <v-card-title><h4>FPV UCM v Trnave</h4></v-card-title>
        <v-data-table
          :headers="headers"
          :items="getMembersByUniversity('UCM')"
          class="custom-table"
          :page-text="'{0}-{1} z {2}'"
          items-per-page-text="Členovia na stránku"
        >
          <template v-slot:body="{ items }">
            <tr v-for="member in items" :key="member.name">
              <td>{{ member.name }}</td>
              <td class="d-flex justify-end align-center">
                <v-btn color="#FFCD16" @click="openDialog('edit', member)">
                  <v-icon size="24">mdi-pencil</v-icon>
                </v-btn>
                <v-btn color="#BC463A" @click="deleteMember(member)">
                  <v-icon size="24" color="white">mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card>
    </v-col>
  </v-row>

  <!-- Add/Edit Dialog -->
  <v-dialog v-model="isDialogOpen" max-width="800px">
    <v-card>
      <v-card-title>
        {{ dialogMode === 'add' ? 'Pridať člena' : 'Upraviť člena' }}
      </v-card-title>
      <v-card-text>
        <v-text-field v-model="currentMember.name" label="Meno" outlined />
        <v-radio-group v-model="currentMember.university" label="Vyberte univerzitu">
          <v-radio label="UKF" value="UKF" />
          <v-radio label="UMB" value="UMB" />
          <v-radio label="UCM" value="UCM" />
        </v-radio-group>
      </v-card-text>
      <v-card-actions>
        <v-btn color="secondary" @click="closeDialog">Zrušiť</v-btn>
        <v-btn color="primary" @click="saveMember">
          {{ dialogMode === 'add' ? 'Pridať' : 'Uložiť' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style lang="scss"></style>
