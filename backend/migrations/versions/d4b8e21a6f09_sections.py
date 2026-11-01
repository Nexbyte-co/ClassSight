"""sections: students belong to a section shared by all classes of that section

Revision ID: d4b8e21a6f09
Revises: c3a9f10d7e55
Create Date: 2026-11-02 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4b8e21a6f09'
down_revision: Union[str, Sequence[str], None] = 'c3a9f10d7e55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Section names are trimmed and compared ignoring case. Two classes of the same course whose
    # sections differ only that way would collapse into one (course, section) pair: stop and
    # list them rather than guess which to keep.
    clashes = op.get_bind().execute(sa.text(
        "SELECT lower(course) AS course, lower(trim(section)) AS section, count(*) "
        "FROM classrooms GROUP BY 1, 2 HAVING count(*) > 1"
    )).fetchall()
    if clashes:
        raise RuntimeError(
            "Cannot create sections: these classes would become duplicates "
            f"(course, section, count): {[tuple(row) for row in clashes]}. Rename or remove them first."
        )

    op.create_table('sections',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=40), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('uq_sections_name_lower', 'sections', [sa.text('lower(name)')], unique=True)

    # One section per distinct (case-insensitive) classroom section name; the first spelling wins.
    op.execute(
        """
        INSERT INTO sections (name)
        SELECT DISTINCT ON (lower(trim(section))) trim(section) FROM classrooms
        ORDER BY lower(trim(section)), id
        """
    )

    op.add_column('classrooms', sa.Column('section_id', sa.Integer(), nullable=True))
    op.execute(
        "UPDATE classrooms SET section_id = sections.id FROM sections "
        "WHERE lower(sections.name) = lower(trim(classrooms.section))"
    )
    op.alter_column('classrooms', 'section_id', nullable=False)
    op.create_foreign_key('fk_classrooms_section_id', 'classrooms', 'sections', ['section_id'], ['id'])
    op.create_index(op.f('ix_classrooms_section_id'), 'classrooms', ['section_id'], unique=False)

    op.add_column('students', sa.Column('section_id', sa.Integer(), nullable=True))
    op.execute(
        "UPDATE students SET section_id = classrooms.section_id FROM classrooms "
        "WHERE classrooms.id = students.classroom_id"
    )
    op.alter_column('students', 'section_id', nullable=False)
    op.create_foreign_key('fk_students_section_id', 'students', 'sections', ['section_id'], ['id'])
    op.create_index(op.f('ix_students_section_id'), 'students', ['section_id'], unique=False)

    op.drop_constraint('uq_classrooms_course_section', 'classrooms', type_='unique')
    op.create_unique_constraint('uq_classrooms_course_section', 'classrooms', ['course', 'section_id'])
    op.drop_constraint('students_classroom_id_fkey', 'students', type_='foreignkey')
    op.drop_column('students', 'classroom_id')
    op.drop_column('classrooms', 'section')


def downgrade() -> None:
    """Downgrade schema.

    Lossy: a student belonged to one class before sections, so each student goes back to the
    lowest-numbered class of their section."""
    orphans = op.get_bind().execute(sa.text(
        "SELECT count(*) FROM students s WHERE NOT EXISTS "
        "(SELECT 1 FROM classrooms c WHERE c.section_id = s.section_id)"
    )).scalar()
    if orphans:
        raise RuntimeError(
            f"Cannot downgrade: {orphans} student(s) belong to a section with no class. "
            "Create a class for that section or remove those students first."
        )
    op.add_column('classrooms', sa.Column('section', sa.String(length=40), nullable=True))
    op.execute(
        "UPDATE classrooms SET section = sections.name FROM sections WHERE sections.id = classrooms.section_id"
    )
    op.alter_column('classrooms', 'section', nullable=False)

    op.add_column('students', sa.Column('classroom_id', sa.Integer(), nullable=True))
    op.execute(
        "UPDATE students SET classroom_id = "
        "(SELECT MIN(c.id) FROM classrooms c WHERE c.section_id = students.section_id)"
    )
    op.alter_column('students', 'classroom_id', nullable=False)
    op.create_foreign_key('students_classroom_id_fkey', 'students', 'classrooms', ['classroom_id'], ['id'])

    op.drop_constraint('uq_classrooms_course_section', 'classrooms', type_='unique')
    op.create_unique_constraint('uq_classrooms_course_section', 'classrooms', ['course', 'section'])

    op.drop_index(op.f('ix_students_section_id'), table_name='students')
    op.drop_constraint('fk_students_section_id', 'students', type_='foreignkey')
    op.drop_column('students', 'section_id')
    op.drop_index(op.f('ix_classrooms_section_id'), table_name='classrooms')
    op.drop_constraint('fk_classrooms_section_id', 'classrooms', type_='foreignkey')
    op.drop_column('classrooms', 'section_id')
    op.drop_index('uq_sections_name_lower', table_name='sections')
    op.drop_table('sections')
