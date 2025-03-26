<script lang="ts">
import { defineComponent, ref, reactive, onMounted, computed, inject } from 'vue'
import { useHomepageStore } from '@/stores/homepageStore.ts'
import type { Committee } from '@/types/homepage.ts'

export default defineComponent({
  name: 'ConferenceCommittee',
  setup() {
    /** Global showSnackbar function **/
    const showSnackbar = inject('showSnackbar')as ({
                                                     message,
                                                     color,
                                                   }: {
      message: string
      color?: string
    }) => void

    if (!showSnackbar) {
      console.error('showSnackbar is not provided')
    }
    const homepageStore = useHomepageStore();
    const committees = computed(() => homepageStore.committees);

    // Dialog states
    const isDialogOpen = ref(false)
    const dialogMode = ref<'add' | 'edit'>('add')
    const currentMember = reactive<Committee>({
      _id: '',
      fullName: '',
      university: 'UKF',
    })

    // Headers for the table
    const headers = [
      { title: 'Člen výboru', value: 'fullName' },
      { title: '', value: 'actions', sortable: false },
    ]

    // Open Dialog for Add/Edit
    const openDialog = (
      mode: 'add' | 'edit',
      member: { _id: string; fullName: string; university: string } = { _id: '', fullName: '', university: 'UKF' } // Default object
    ) => {
      dialogMode.value = mode;
      Object.assign(currentMember, member);
      isDialogOpen.value = true;
    };

    // Close the dialog
    const closeDialog = () => {
      isDialogOpen.value = false
      currentMember.fullName = ''
      currentMember.university = 'UKF'
    }

    // Save/Add Member
    const saveMember = async () => {
      const member = { fullName: currentMember.fullName, university: currentMember.university };
      try {
        if (dialogMode.value === 'add') {
          await homepageStore.addCommittee(member);
          showSnackbar?.({
            message: 'Člen úspešne pridaný.',
            color: 'success'})
        } else {
          await homepageStore.updateCommittee(currentMember._id, member);
          showSnackbar?.({
            message: 'Člen úspešne upravený.',
           color: 'success'
          });
        }
        closeDialog();
      } catch {
        showSnackbar?.({
          message: 'Nepodarilo sa uložiť člena.',
          color: 'error'
        });
      }
    }

    const deleteMember = async (member: { _id: string; fullName: string; university: string }) => {
      try {
        await homepageStore.deleteCommittee(member._id);
        showSnackbar?.({
          message: 'Člen úspešne odstránený.',
          color: 'success'
        });
      } catch {
        showSnackbar?.({
          message: 'Nepodarilo sa odstrániť člena.',
          color: 'error'
        });
      }
    }

    // Filter members by university
    const getMembersByUniversity = (university: 'UKF' | 'UMB' | 'UCM') => {
      return committees.value.filter(member => member.university === university);
    }

    onMounted(async () => {
      await homepageStore.fetchCommittees();
      console.log("Fetched Committees:", homepageStore.committees); // Debugging log
    });


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
            <tr v-for="member in items" :key="member.fullName">
              <td>{{ member.fullName }}</td>
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
            <tr v-for="member in items" :key="member.fullName">
              <td>{{ member.fullName }}</td>
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
            <tr v-for="member in items" :key="member.fullName">
              <td>{{ member.fullName }}</td>
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
        <v-text-field v-model="currentMember.fullName" label="Meno" outlined />
        <v-radio-group v-model="currentMember.university" label="Vyberte univerzitu">
          <v-radio label="UKF" value="UKF" />
          <v-radio label="UMB" value="UMB" />
          <v-radio label="UCM" value="UCM" />
        </v-radio-group>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="outlined" color="#BC463A" @click="closeDialog">Zrušiť</v-btn>
        <v-btn variant="outlined" color="primary" @click="saveMember">
          {{ dialogMode === 'add' ? 'Pridať' : 'Uložiť' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style lang="scss"></style>
