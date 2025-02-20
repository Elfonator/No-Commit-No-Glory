<script lang="ts">
import {defineComponent, ref, computed, onMounted, inject, reactive} from 'vue'
import { useUserStore } from '@/stores/userStore'
import { UserStatus } from '@/types/user'

export default defineComponent({
  name: 'UserTable',
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

    const userStore = useUserStore()

    // Filters for table
    const filters = ref({
      first_name: '',
      last_name: '',
      university: '',
      selectedStatus: [] as string[],
      selectedRole: [] as string[],
    })

    const currentPage = ref(1)
    const perPage = ref(10)
    const isDialogOpen = ref(false)
    const isDeleteDialogOpen = ref(false);
    const userToDelete = ref(null);
    const dialogMode = ref<'edit'>('edit')
    const selectedUser = ref<any>({})


    // University and status options
    const universityOptions = [
      'Univerzita Konštantína Filozofa',
      'Univerzita sv. Cyrila a Metoda',
      'Univerzita Mateja Bela',
    ]
    const statusOptions = ['Aktívny', 'Neaktívny', 'Čakajúci', 'Pozastavený']
    const roleOptions = Object.values(userStore.reverseRoleMapping) //Use Slovak roles from store
    const statusColors = {
      [UserStatus.Active]: 'green',
      [UserStatus.Inactive]: 'grey',
      [UserStatus.Pending]: 'blue',
      [UserStatus.Suspended]: 'red',
    }

    const roleColors = {
      Admin: 'pink',
      Účastník: 'black',
      Recenzent: 'primary',
      admin: 'pink',
      participant: 'black',
      reviewer: 'primary',
    }

    //user deletion handling

    const confirmDelete = (user: {
      _id: string
      first_name: string
      last_name: string
    }) => {
      Object.assign(selectedUser.value, user)
      isDeleteDialogOpen.value = true
    }

    const closeDeleteDialog = () => {
      isDeleteDialogOpen.value = false
    }

    const deleteUser = async () => {
      try {
        await userStore.deleteUser(selectedUser.value._id);
        showSnackbar?.({
          message: 'Používateľ bol úspešne odstránený.',
          color: 'success',
        });
      } catch (error) {
        console.error('Error deleting user:', error);
        showSnackbar?.({
          message: 'Nepodarilo sa odstrániť používateľa.',
          color: 'error',
        });
      } finally {
        closeDeleteDialog();
      }
    };

    // Table headers
    const tableHeaders = [
      { title: 'Stav', value: 'status' },
      { title: 'Priezvisko', value: 'last_name' },
      { title: 'Meno', value: 'first_name' },
      { title: 'Email', value: 'email' },
      { title: 'Univerzita', value: 'university' },
      { title: 'Fakulta', value: 'faculty' },
      { title: 'Role', value: 'role' },
      { title: '', value: 'actions', sortable: false },
    ]

    // Filtered users computed property
    const filteredUsers = computed(() =>
      userStore.adminUsers.filter(user => {
        return (
          (!filters.value.first_name ||
            user.first_name
              .toLowerCase()
              .includes(filters.value.first_name.toLowerCase())) &&
          (!filters.value.last_name ||
            user.last_name
              .toLowerCase()
              .includes(filters.value.last_name.toLowerCase())) &&
          (!filters.value.university ||
            user.university
              .toLowerCase()
              .includes(filters.value.university.toLowerCase())) &&
          (!filters.value.selectedStatus.length ||
            filters.value.selectedStatus.includes(user.status)) &&
          (!filters.value.selectedRole.length ||
            filters.value.selectedRole.includes(
              userStore.reverseRoleMapping[user.role.name] || user.role.name,
            ))
        )
      }),
    )

    // Reset filters
    const resetFilters = () => {
      filters.value = {
        first_name: '',
        last_name: '',
        university: '',
        selectedStatus: [],
        selectedRole: [],
      }
    }

    // Open dialog for edit
    const openDialog = (mode: 'edit', user?: any) => {
      dialogMode.value = mode
      if (mode === 'edit' && user) {
        // Populate selected user with Slovak role for UI
        selectedUser.value = {
          ...user,
          role:
            userStore.reverseRoleMapping[user.role.name || user.role] ||
            user.role,
        }
      } else {
        selectedUser.value = {}
      }
      isDialogOpen.value = true
    }

    // Close dialog
    const closeDialog = () => {
      isDialogOpen.value = false
      selectedUser.value = {}
    }

    // Save user changes
    const saveUser = async () => {
      if (dialogMode.value === 'edit') {
        //Map Slovak role back to English before sending to the API
        const updates = {
          ...selectedUser.value,
          role:
            userStore.roleMapping[selectedUser.value.role] ||
            selectedUser.value.role,
        }
        await userStore.updateUser(selectedUser.value._id, updates)
      }
      closeDialog()
    }

    // Fetch users on component mount
    onMounted(userStore.fetchAllUsers)

    return {
      filters,
      currentPage,
      perPage,
      isDialogOpen,
      dialogMode,
      selectedUser,
      universityOptions,
      statusOptions,
      roleOptions,
      statusColors,
      tableHeaders,
      filteredUsers,
      roleColors,
      userStore,
      userToDelete,
      isDeleteDialogOpen,
      resetFilters,
      openDialog,
      closeDialog,
      saveUser,
      deleteUser,
      confirmDelete,
      closeDeleteDialog,
    }
  },
})
</script>

<template>
  <v-card class="table-card">
    <!-- Card Header -->
    <v-card-title>
      <h3>Správa používateľov</h3>
    </v-card-title>

    <!-- Filters Section -->
    <v-card-subtitle>
      <v-row>
        <v-col cols="12" md="2">
          <v-select
            v-model="filters.selectedStatus"
            :items="statusOptions"
            label="Stav"
            outlined
            dense
            multiple
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-select
            v-model="filters.selectedRole"
            :items="roleOptions"
            label="Rola"
            outlined
            dense
            multiple
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.last_name"
            label="Filtrovať podľa priezviska"
            outlined
            dense
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.university"
            label="Filtrovať podľa univerzity"
            outlined
            dense
          />
        </v-col>
        <v-col cols="10" md="2">
          <v-btn color="primary" small @click="resetFilters">
            Zrušiť filter
          </v-btn>
        </v-col>
      </v-row>
    </v-card-subtitle>

    <!-- Table -->
    <v-data-table
      :headers="tableHeaders"
      :items="filteredUsers"
      :items-per-page="perPage"
      :page.sync="currentPage"
      class="custom-table"
      dense
      item-value="_id"
    >
      <template v-slot:body="{ items }">
        <tr v-for="user in items" :key="user._id">
          <td>
            <v-chip
              :color="statusColors[user.status as keyof typeof statusColors]"
              dark
              small
              class="d-flex justify-center custom-chip rounded"
            >
              {{ user.status }}
            </v-chip>
          </td>
          <td>{{ user.last_name }}</td>
          <td>{{ user.first_name }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.university }}</td>
          <td>{{ user.faculty }}</td>
          <td>
            <v-chip
              :color="roleColors[user.role as keyof typeof roleColors]"
              dark
              small
              prepend-icon="mdi-label"
              class="d-flex justify-start custom-chip rounded"
            >
              {{
                userStore.reverseRoleMapping[user.role.name] ||
                userStore.reverseRoleMapping[user.role] ||
                user.role
              }}
            </v-chip>
          </td>
          <td class="d-flex justify-center align-center">
            <v-btn @click="openDialog('edit', user)" color="#FFCD16">
              <v-icon size="24">mdi-pencil</v-icon>
            </v-btn>
            <v-btn color="#BC463A" @click="confirmDelete(user)">
              <v-icon size="24" color="white">mdi-delete</v-icon>
            </v-btn>
          </td>
        </tr>
      </template>
    </v-data-table>
  </v-card>

  <!-- Dialog for Editing Users -->
  <v-dialog v-model="isDialogOpen" max-width="800px">
    <v-card>
      <v-card-title>Úprava používateľa</v-card-title>
      <v-card-text>
        <v-form ref="userForm">
          <v-select
            v-model="selectedUser.status"
            :items="statusOptions"
            label="Stav"
            outlined
            dense
          />
          <v-select
            v-model="selectedUser.role"
            :items="roleOptions"
            label="Rola"
            outlined
            dense
          />
          <v-text-field
            v-model="selectedUser.email"
            label="Email"
            outlined
            dense
          />
          <v-select
            v-model="selectedUser.university"
            :items="universityOptions"
            label="Univerzita"
            outlined
            dense
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn color="secondary" @click="closeDialog">Zrušiť</v-btn>
        <v-btn color="primary" @click="saveUser">Uložiť</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog for deleting Users -->
  <v-dialog v-model="isDeleteDialogOpen" max-width="500px">
    <v-card>
      <v-card-title>Potvrdenie odstránenia</v-card-title>
      <v-card-text>
        <p>
          Ste si istí, že chcete odstrániť používateľa
          <strong>{{ selectedUser.first_name }} {{ selectedUser.last_name }}</strong>?
        </p>
      </v-card-text>
      <v-card-actions>
        <v-btn color="secondary" @click="closeDeleteDialog">Zrušiť</v-btn>
        <v-btn color="red" @click="deleteUser">Odstrániť</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style></style>
