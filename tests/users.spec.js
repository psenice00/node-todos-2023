import test from 'ava'
import supertest from 'supertest'
import { app } from '../src/app.js'
import { db, createUser, getUserByPassword, getUserByToken } from '../src/database.js'

test.beforeEach(async () => {
  await db.migrate.latest()
})

test.afterEach(async () => {
  await db.migrate.rollback()
})

test.serial('createUser creates users', async (t) => {
  const user = await createUser('username', 'password')

  t.is(user.username, 'username')
  t.not(user.password, 'password')
})

test.serial('getUserByPassword gets user by password', async (t) => {
  const user = await createUser('username', 'password')

  t.deepEqual(await getUserByPassword('username', 'password'), user)
  t.notDeepEqual(await getUserByPassword('username', 'bad'), user)
  t.notDeepEqual(await getUserByPassword('bad', 'password'), user)
})

test.serial('getUserByToken gets user by password', async (t) => {
  const user = await createUser('username', 'password')

  t.deepEqual(await getUserByToken(user.token), user)
  t.notDeepEqual(await getUserByToken('bad'), user)
})

test.serial('GET /register it shows registration form', async (t) => {
  const response = await supertest(app).get('/register')

  t.assert(response.text.includes('Registrace'))
})

test.serial('POST /register after registration username is visible', async (t) => {
  const agent = supertest.agent(app)

  const response = await agent.post('/register').type('form').send({ username: 'adam', password: 'heslo' }).redirects(1)

  t.assert(response.text.includes('adam'))
})

test.serial('GET /login it shows login form', async (t) => {
  const response = await supertest(app).get('/login')

  t.assert(response.text.includes('Přihlášení'))
})

test.serial('POST /login after login username is visible', async (t) => {
  await createUser('kuba', 'password')
  const agent = supertest.agent(app)

  const response = await agent.post('/login').type('form').send({ username: 'kuba', password: 'password' }).redirects(1)

  t.assert(response.text.includes('kuba'))
})

test.serial('POST /login after login with incorect password not save cookie with user', async (t) => {
  await createUser('kuba', 'password')
  const agent = supertest.agent(app)

  const response = await agent.post('/login').type('form').send({ username: 'kuba', password: 'wrongPassword' }).redirects(1)

  t.assert(!response.text.includes('kuba'))
})

test.serial('POST /login after login with non-existing user will not  be saved cookie with user', async (t) => {
  const agent = supertest.agent(app)

  const response = await agent.post('/login').type('form').send({ username: 'kuba', password: 'wrongPassword' }).redirects(1)

  t.assert(!response.text.includes('kuba'))
})

test.serial('POST /logout after logout is cookie cleaned', async (t) => {
   await createUser('kuba', 'password')
  const agent = supertest.agent(app)

  const signIn = await supertest.agent(app).post('/login').type('form').send({ username: 'kuba', password: 'password' }).redirects(1)
  t.assert(signIn.text.includes('kuba'))

  const response = await agent.post('/logout').type('form').redirects(1)

  t.assert(!response.text.includes('kuba'))
})
