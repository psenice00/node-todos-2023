import express from 'express'
import knex from 'knex'
import knexfile from './knexfile.js'

const app = express()
const db = knex(knexfile)

app.set('view engine', 'ejs')

app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

app.get('/', async (req, res) => {
  const query = db('todos').select('*')

  if (req.query.done) {
    query.where('done', req.query.done === 'true')
  }

  const todos = await query

  return res.render('index', {
    todos: todos,
  })
})

app.post('/new-todo', async (req, res) => {
  const newTodo = {
    title: req.body.title,
    deadline: req.body.deadline || null,
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

app.get('/detail-todo/:id', async (req, res, next) => {
  const idToShow = Number(req.params.id)

  const todoToShow = await db('todos').select('*').where('id', idToShow).first()

  if (!todoToShow) return next()

  res.render('detail', {
    todo: todoToShow,
  })
})

app.post('/update-todo/:id', async (req, res, next) => {
  const idToUpdate = Number(req.params.id)
  const newTitle = String(req.body.title)

  const todoToUpdate = await db('todos').select('*').where('id', idToUpdate).first()

  if (!todoToUpdate) return next()

  await db('todos').update({ title: newTitle }).where('id', idToUpdate)

  res.redirect('back')
})

app.use((req, res) => {
  res.status(404).render('404')
})

app.listen(3000, () => {
  console.log('App listening on port 3000')
})
