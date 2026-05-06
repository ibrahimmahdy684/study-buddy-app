// GraphQL queries for user operations
// Pages will implement their own queries as needed

export const QUERY_GET_USER = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      email
      name
      avatar
      createdAt
      updatedAt
    }
  }
`

export const MUTATION_LOGIN = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        name
      }
    }
  }
`

export const MUTATION_REGISTER = `
  mutation Register($email: String!, $name: String!, $password: String!) {
    register(email: $email, name: $name, password: $password) {
      token
      user {
        id
        email
        name
      }
    }
  }
`
