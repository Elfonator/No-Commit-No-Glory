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

    const valid = ref(false)

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
    const isDeleteDialogOpen = ref(false)
    const dialogMode = ref<'add' | 'edit'>('add')
    const userStore = useUserStore();

    // Form for new/edit users
    const userForm = reactive({
      _id: '', // Ensure we store `_id` for updates
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirmPassword: '',
      university: '',
      faculty: '',
      role: '',
      status: UserStatus.Active,
    })

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

    // Check if passwords match
    const passwordMismatch = computed(() => {
      return userForm.password !== userForm.confirmPassword && userForm.confirmPassword !== ''
    })

    // Toggle password visibility
    const showPassword = ref(false)
    const showConfirmPassword = ref(false)
    const togglePasswordVisibility = () => (showPassword.value = !showPassword.value)
    const toggleConfirmPasswordVisibility = () => (showConfirmPassword.value = !showConfirmPassword.value)

    // Open dialog for add/edit user
    const openDialog = (mode: 'add' | 'edit', user?: any) => {
      dialogMode.value = mode;

      if (mode === 'edit' && user) {
        Object.assign(userForm, { ...user }) // Clone user for editing
      } else {
        Object.assign(userForm, {
          _id: '',
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          confirmPassword: '',
          university: '',
          faculty: '',
          role: '',
          status: UserStatus.Active,
        })
      }
      isDialogOpen.value = true
    }

    // Close dialog
    const closeDialog = () => {
      isDialogOpen.value = false
    }

// Save user (create or update)
    const saveUser = async () => {
      try {
        const userData: any = {
          first_name: userForm.first_name || '',
          last_name: userForm.last_name || '',
          email: userForm.email || '',
          university: userForm.university || '',
          faculty: userForm.faculty || '',
          role: userStore.roleMapping[userForm.role] || userForm.role || '',
          status: userForm.status || '',
        };

        if (!userForm._id) { // If no ID, create a new user
          userData.password = userForm.password || ''; // Include password only for new users
          await userStore.createUser(userData);
          showSnackbar?.({ message: 'Používateľ bol úspešne pridaný.', color: 'success' });
        } else { // If ID exists, update user
          await userStore.updateUser(userForm._id, userData);
          showSnackbar?.({ message: 'Údaje používateľa boli aktualizované.', color: 'success' });
        }

        closeDialog();
      } catch (error) {
        showSnackbar?.({ message: 'Nepodarilo sa uložiť používateľa.', color: 'error' });
      }
    };


    // User deletion handling
    const confirmDelete = (user: { _id: string; first_name: string; last_name: string }) => {
      Object.assign(userForm, user)
      isDeleteDialogOpen.value = true
    }

    const closeDeleteDialog = () => {
      isDeleteDialogOpen.value = false
    }

    const deleteUser = async () => {
      try {
        await userStore.deleteUser(userForm._id)
        showSnackbar?.({ message: 'Používateľ bol úspešne odstránený.', color: 'success' })
      } catch (error) {
        console.error('Error deleting user:', error)
        showSnackbar?.({ message: 'Nepodarilo sa odstrániť používateľa.', color: 'error' })
      } finally {
        closeDeleteDialog()
      }
    }

    return {
      valid,
      filters,
      currentPage,
      perPage,
      isDialogOpen,
      isDeleteDialogOpen,
      userForm,
      universityOptions,
      statusOptions,
      roleOptions,
      tableHeaders,
      filteredUsers,
      passwordMismatch,
      showPassword,
      showConfirmPassword,
      statusColors,
      roleColors,
      dialogMode,
      userStore,
      resetFilters,
      openDialog,
      closeDialog,
      saveUser,
      deleteUser,
      confirmDelete,
      closeDeleteDialog,
      togglePasswordVisibility,
      toggleConfirmPasswordVisibility,
    }
  },
})
</script>

<template>
  <v-card>
    <!-- Card Header -->
    <v-card-title>
      <div class="d-flex justify-space-between align-center w-100">
        <h3>Správa používateľov</h3>
        <v-btn color="primary" class="add_new" @click="openDialog('add')">
          <v-icon left class="add_icon">mdi-plus-circle-outline</v-icon>Pridať používateľa</v-btn>
      </div>
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

  <!-- Dialog for Add/Edit Users -->
  <v-dialog v-model="isDialogOpen" max-width="800px">
    <v-card>
      <v-card-title>
        {{ dialogMode === 'edit' ? 'Úprava používateľa' : 'Pridať nového používateľa' }}
      </v-card-title>
      <v-card-text>
        <v-form ref="userForm" v-model="valid">
          <v-select v-model="userForm.status" :items="statusOptions" label="Stav" outlined dense />
          <v-select v-model="userForm.role" :items="roleOptions" label="Rola" outlined dense />
          <v-text-field
            v-model="userForm.first_name"
            label="Meno"
            :rules="[v => !!v || 'Meno je povinné']"
            outlined
            dense
          />
          <v-text-field
            v-model="userForm.last_name"
            label="Priezvisko"
            :rules="[v => !!v || 'Priezvisko je povinné']"
            outlined
            dense
          />
          <v-text-field
            v-model="userForm.email"
            label="Email"
            :rules="[v => !!v || 'Email je povinný', v => /.+@.+\..+/.test(v) || 'Neplatný email']"
            outlined
            dense
          />

          <!-- Password only required when adding a new user -->
          <v-text-field
            v-if="dialogMode === 'add'"
            v-model="userForm.password"
            label="Heslo"
            :type="showPassword ? 'text' : 'password'"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="togglePasswordVisibility"
            :rules="[v => !!v || 'Heslo je povinné', v => v.length >= 6 || 'Heslo musí mať aspoň 6 znakov']"
          />
          <!-- Confirm Password Field -->
          <v-text-field
            v-if="dialogMode === 'add'"
            v-model="userForm.confirmPassword"
            label="Zopakujte heslo"
            :type="showConfirmPassword ? 'text' : 'password'"
            :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="toggleConfirmPasswordVisibility"
            :rules="[v => !!v || 'Potvrdenie hesla je povinné', v => v === userForm.password || 'Heslá sa nezhodujú']"
          />

          <v-select v-model="userForm.university" :items="universityOptions" label="Univerzita" outlined dense />
          <v-text-field v-model="userForm.faculty" label="Fakulta" outlined dense />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn color="secondary" @click="closeDialog">Zrušiť</v-btn>
        <v-btn :disabled="!valid" color="primary" @click="saveUser">Uložiť</v-btn>
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
          <strong>{{ userForm.first_name }} {{ userForm.last_name }}</strong>?
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
