import express from 'express'
import knex from 'knex'
import knexfile from './knexfile.js'

const app = express()
const db = knex(knexfile)

app.set('view engine', 'ejs')

app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

let todos = []

app.get('/', async (req, res) => {
  const todos = await db('todos').select('*')

  res.render('index', {
    todos: todos,
  })
})

app.post('/new-todo', async (req, res) => {
  const newTodo = {
    title: req.body.title,
  }

  await db('todos').insert(newTodo)

  res.redirect('/')
})

app.get('/remove-todo/:id', async (req, res) => {
  const idToRemove = Number(req.params.id)

  await db('todos').delete().where('id', idToRemove)

  res.redirect('/')
})

app.get('/toggle-todo/:id', async (req, res, next) => {
  const idToToggle = Number(req.params.id)

  const todoToToggle = await db('todos').select('*').where('id', idToToggle).first()

  if (!todoToToggle) return next()

  await db('todos').update({ done: !todoToToggle.done }).where('id', idToToggle)

  res.redirect('back')
})

app.get('/detail-todo/:id', (req, res, next) => {
  const idToShow = Number(req.params.id)

  const todoToShow = todos.find((todo) => todo.id === idToShow)

  if (!todoToShow) return next()

  res.render('detail', {
    todo: todoToShow,
  })
})

app.post('/update-todo/:id', (req, res, next) => {
  const idToUpdate = Number(req.params.id)
  const newTitle = String(req.body.title)

  const todoToUpdate = todos.find((todo) => todo.id === idToUpdate)

  if (!todoToUpdate) return next()

  todoToUpdate.title = newTitle

  res.redirect('back')
})

app.use((req, res) => {
  res.status(404).render('404')
})

app.listen(3000, () => {
  console.log('App listening on port 3000')
})
