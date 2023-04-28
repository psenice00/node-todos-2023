/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
    await knex.schema.alterTable('todos', (table) => {
      table.integer('userId').references('id').inTable('users')
    })
  }
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  export const down = async function (knex) {
    await knex.schema.alterTable('todos', (table) => {
      table.dropColumn('userId')
    })
  }
  