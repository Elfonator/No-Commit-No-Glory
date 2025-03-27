<script lang="ts">
import {defineComponent, ref, computed, onMounted, inject, reactive, watch} from 'vue'
import { useUserStore } from '@/stores/userStore'
import { UserStatus } from '@/types/user'

export default defineComponent({
  name: 'UserTable',
  setup() {
    const showSnackbar = inject('showSnackbar') as ({ message, color }: {
      message: string
      color?: string
    }) => void

    if (!showSnackbar) {
      console.error('showSnackbar is not provided')
    }

    const valid = ref(false)
    const userStore = useUserStore()

    // Filters for table
    const filters = ref({
      name: '',
      university: '',
      selectedStatus: [] as string[],
      selectedRole: [] as string[],
    })

    const currentPage = ref(1)
    const perPage = ref(10)
    const isDialogOpen = ref(false)
    const isDeleteDialogOpen = ref(false)
    const userToDelete = ref(null);
    const dialogMode = ref<'add' | 'edit'>('add')
    const password = ref('')
    const confirmPassword = ref('')
    const showPassword = ref(false)
    const showConfirmPassword = ref(false)

    const customUniversity = ref('')

    const currentUser = reactive({
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
    });

    watch(() => currentUser.university, (newVal) => {
      if (newVal !== 'Iné') {
        customUniversity.value = ''
      }
    })

    // University and status options
    const universityOptions = [
      'Univerzita Konštantína Filozofa',
      'Univerzita sv. Cyrila a Metoda',
      'Univerzita Mateja Bela',
      'Iné',
    ]
    const statusOptions = ['Aktívny', 'Neaktívny', 'Čakajúci', 'Pozastavený']
    //const roleOptions = Object.values(userStore.reverseRoleMapping) //Use Slovak roles from store
    const roleOptions = Object.entries(userStore.reverseRoleMapping).map(
      ([key, label]) => ({
        value: key,
        text: label,
      })
    )
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
        const rawRole = typeof user.role === 'string' ? user.role : user.role?.name

        const roleKey = Object.entries(userStore.reverseRoleMapping)
          .find(([, label]) => label === rawRole)?.[0] ?? rawRole

        return (
          (!filters.value.name ||
            `${user.first_name} ${user.last_name}`
              .toLowerCase()
              .includes(filters.value.name.toLowerCase())) &&
          (!filters.value.university ||
            user.university
              .toLowerCase()
              .includes(filters.value.university.toLowerCase())) &&
          (!filters.value.selectedStatus.length ||
            filters.value.selectedStatus.includes(user.status)) &&
          (!filters.value.selectedRole.length ||
            filters.value.selectedRole.includes(roleKey))
        )
      }),
    )

    // Reset filters
    const resetFilters = () => {
      filters.value = {
        name: '',
        university: '',
        selectedStatus: [],
        selectedRole: [],
      }
    }

    // Check if passwords match
    const passwordMismatch = computed(() => {
      return currentUser.password !== currentUser.confirmPassword && currentUser.confirmPassword !== ''
    })

    const togglePasswordVisibility = () => {
      showPassword.value = !showPassword.value
    }

    const toggleConfirmPasswordVisibility = () => {
      showConfirmPassword.value = !showConfirmPassword.value
    }

    // Open dialog for add/edit user
    const openDialog = async (mode: 'add' | 'edit', userId?: string) => {
      dialogMode.value = mode;

      if (mode === 'edit' && userId) {
        const user = await userStore.fetchUserById(userId);
        Object.assign(currentUser, { ...user });
      } else {
        Object.assign(currentUser, {
          _id: '',
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          university: '',
          faculty: '',
          role: '',
          status: UserStatus.Active
        });
      }

      isDialogOpen.value = true;
    };

    // Close dialog
    const closeDialog = () => {
      isDialogOpen.value = false;

      // Reset user
      Object.assign(currentUser, {
        _id: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        university: '',
        faculty: '',
        role: '',
        status: UserStatus.Active
      })
    };

// Save user (create or update)
    const saveUser = async () => {
      try {
        const payload: any = {
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
          email: currentUser.email,
          university: currentUser.university === 'Iné' ? customUniversity.value : currentUser.university,
          faculty: currentUser.faculty,
          role: userStore.roleMapping[currentUser.role] || currentUser.role,
          status: currentUser.status,
        };

        // Only send password if the user is being created or explicitly changing it
        if (dialogMode.value === 'add' || (currentUser.password && currentUser.password.trim() !== "")) {
          payload.password = currentUser.password;
        }

        console.log("Sending update payload:", payload); // Debugging

        if (dialogMode.value === 'add') {
          await userStore.createUser(payload);
        } else {
          await userStore.updateUser(currentUser._id, payload);
        }
        showSnackbar?.({ message: 'Údaje používateľa boli aktualizované.', color: 'success' })
        closeDialog()
      } catch (error) {
        showSnackbar?.({ message: 'Nepodarilo sa uložiť používateľa.', color: 'error' })
      }
    };

    //user deletion handling
    const confirmDelete = (user: {
      _id: string
      first_name: string
      last_name: string
    }) => {
      Object.assign(currentUser, user)
      isDeleteDialogOpen.value = true
    }

    const closeDeleteDialog = () => {
      isDeleteDialogOpen.value = false
    }

    const deleteUser = async () => {
      try {
        await userStore.deleteUser(currentUser._id);
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

    // Fetch users on component mount
    onMounted(userStore.fetchAllUsers)

    return {
      valid,
      filters,
      currentPage,
      perPage,
      isDialogOpen,
      dialogMode,
      currentUser,
      universityOptions,
      customUniversity,
      statusOptions,
      roleOptions,
      statusColors,
      tableHeaders,
      filteredUsers,
      roleColors,
      userStore,
      userToDelete,
      isDeleteDialogOpen,
      passwordMismatch,
      password,
      showPassword,
      confirmPassword,
      showConfirmPassword,
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
            item-title="text"
            item-value="value"
            label="Rola"
            multiple
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.name"
            label="Používateľ"
            outlined
            dense
            clearable
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.university"
            label="Univerzita"
            outlined
            dense
            clearable
          />
        </v-col>
        <v-col cols="8" md="2">
          <v-btn
            color="primary"
            @click="resetFilters"
            title="Zrušiť filter"
            variant="outlined">
            <v-icon>mdi-filter-remove</v-icon>
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
          <td class="truncate-cell">{{ user.university }}</td>
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
            <v-btn @click="openDialog('edit', user._id)" color="#FFCD16">
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
      <v-card-title>{{ dialogMode === 'edit' ? 'Úprava používateľa' : 'Pridať nového používateľa' }}</v-card-title>
      <v-card-text>
        <v-form ref="userForm" v-model="valid">
          <v-select
            v-model="currentUser.status"
            :items="statusOptions"
            label="Stav"
            outlined
            dense
          />
          <v-select
            v-model="currentUser.role"
            :items="roleOptions"
            item-title="text"
            item-value="value"
            label="Rola"
            outlined
            dense
          />
          <v-text-field
            v-model="currentUser.first_name"
            label="Meno"
            :rules="[v => !!v || 'Meno je povinné']"
            outlined
            dense
          />
          <v-text-field
            v-model="currentUser.last_name"
            label="Priezvisko"
            :rules="[v => !!v || 'Priezvisko je povinné']"
            outlined
            dense
          />
          <v-text-field
            v-model="currentUser.email"
            label="Email"
            :rules="[v => !!v || 'Email je povinný', v => /.+@.+\..+/.test(v) || 'Neplatný email']"
            outlined
            dense
          />
          <!-- Password only required when adding a new user -->
          <v-text-field
            v-if="dialogMode === 'add'"
            v-model="currentUser.password"
            label="Heslo"
            :type="showPassword ? 'text' : 'password'"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="togglePasswordVisibility"
            :rules="[v => !!v || 'Heslo je povinné', v => v.length >= 6 || 'Heslo musí mať aspoň 6 znakov']"
          />
          <!-- Confirm Password Field -->
          <v-text-field
            v-if="dialogMode === 'add'"
            v-model="currentUser.confirmPassword"
            label="Zopakujte heslo"
            :type="showConfirmPassword ? 'text' : 'password'"
            :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="toggleConfirmPasswordVisibility"
            :rules="[v => !!v || 'Potvrdenie hesla je povinné', v => v === currentUser.password || 'Heslá sa nezhodujú']"
          />

          <v-select
            v-model="currentUser.university"
            :items="universityOptions"
            label="Univerzita"
            :rules="[v => !!v || 'Univerzita je povinná']"
            outlined
            dense
          />
          <v-text-field
            v-if="currentUser.university === 'Iné'"
            v-model="customUniversity"
            label="Zadajte názov univerzity"
            outlined
            dense
          />
          <v-text-field
            v-model="currentUser.faculty"
            label="Fakulta"
            outlined
            dense
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="outlined" color="#BC463A" @click="closeDialog">Zrušiť</v-btn>
        <v-btn variant="outlined" :disabled="!valid" color="primary" @click="saveUser">Uložiť</v-btn>
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
          <strong>{{ currentUser.first_name }} {{ currentUser.last_name }}</strong>?
        </p>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="outlined" color="primary" @click="closeDeleteDialog">Zrušiť</v-btn>
        <v-btn variant="outlined" color="#BC463A" @click="deleteUser">Odstrániť</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style lang="scss">
.truncate-cell {
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
