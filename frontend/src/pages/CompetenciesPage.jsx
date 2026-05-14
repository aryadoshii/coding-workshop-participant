import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  LinearProgress
} from '@mui/material'

import {
  useEffect,
  useState
} from 'react'

import {
  getCompetencies
} from '../services/api'

export default function CompetenciesPage() {

  const [skills, setSkills] =
    useState([])

  const [employeeName, setEmployeeName] =
    useState('Alex')

  useEffect(() => {

    const loadSkills = async () => {

      const user =
        JSON.parse(
          localStorage.getItem('user')
        )

      const firstName =
        user?.name?.split(' ')[0]
        ||
        'Alex'

      setEmployeeName(firstName)

      const res =
        await getCompetencies()

      const updated =
        (res.data || []).map(skill => ({
          ...skill,
          employee_name: firstName
        }))

      setSkills(updated)

    }

    loadSkills()

  }, [])

  return (
    <Box>

      <Typography
        variant="h3"
        fontWeight={700}
        mb={1}
      >
        Competencies & Skills
      </Typography>

      <Typography
        variant="h6"
        color="text.secondary"
        mb={4}
      >
        Track your skills and growth, {employeeName}
      </Typography>

      <Grid
        container
        spacing={3}
        mb={4}
      >

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography>Total Skills</Typography>
            <Typography variant="h3">
              {skills.length}
            </Typography>
          </Paper>
        </Grid>

      </Grid>

      <TableContainer
        component={Paper}
      >

        <Table>

          <TableHead>

            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Skill</TableCell>
              <TableCell>Current</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Progress</TableCell>
            </TableRow>

          </TableHead>

          <TableBody>

            {skills.map((skill, index) => {

              const progress =
                (
                  (skill.current_level || 0)
                  /
                  (skill.target_level || 1)
                ) * 100

              return (

                <TableRow key={index}>

                  <TableCell>
                    {employeeName}
                  </TableCell>

                  <TableCell>
                    {skill.skill_name}
                  </TableCell>

                  <TableCell>
                    {skill.current_level}/5
                  </TableCell>

                  <TableCell>
                    {skill.target_level}/5
                  </TableCell>

                  <TableCell width="30%">

                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{
                        height: 10,
                        borderRadius: 5
                      }}
                    />

                  </TableCell>

                </TableRow>

              )

            })}

          </TableBody>

        </Table>

      </TableContainer>

    </Box>
  )
}