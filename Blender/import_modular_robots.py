bl_info = {
    "name": "Import UML WebVis Scenario",
    "author": "Peter Kramer",
    "version": (1, 0),
    "blender": (5, 0, 1),
    "location": "File > Import > UML WebVis Scenario",
    "description": "Import a UML WebVis Scenario",
    "warning": "",
    "category": "Import-Export",
}

import io
import pathlib
import traceback
from typing import Annotated, Literal, TypeVar

import bmesh
import bpy
import numpy as np
import numpy.typing as npt
from bpy.props import StringProperty
from bpy_extras.io_utils import ImportHelper

DType = TypeVar("DType", bound=np.generic)
Vec3 = Annotated[npt.NDArray[DType], Literal[3]]


def get_exception_traceback_str(exc: Exception) -> str:
    # Ref: https://stackoverflow.com/a/76584117/
    file = io.StringIO()
    traceback.print_exception(exc, file=file)
    return file.getvalue().rstrip()


def new_cube_mesh(name="CubeMesh", size=1.0):
    mesh = bpy.data.meshes.new(name)

    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=size)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def new_bsdf_material(name:str, rgb:Vec3=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True  # enable node system
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)  # RGBA
    print(rgb)
    return mat

def new_gp_material(name:str, rgb:Vec3=None):
    gp_mat = bpy.data.materials.new(name=name)
    if not gp_mat.is_grease_pencil:
        bpy.data.materials.create_gpencil_data(gp_mat)
    gp_mat.grease_pencil.color = (*rgb, 1.0)
    return gp_mat


def new_line_art(name:str,color:Vec3,width,collection):
    gp = bpy.data.grease_pencils.new(name)
    obj = bpy.data.objects.new(name, gp)
    collection.objects.link(obj)

    layer = gp.layers.new(name="Line Art", set_active=True)
    layer.frames.new(1)

    material = new_gp_material("Line Art", color)
    gp.materials.append(material)

    mod = obj.modifiers.new(name="LineArt", type='LINEART')
    mod.source_collection = collection
    mod.radius = width
    mod.target_layer = "Line Art"
    mod.target_material = material
    return obj



class UMLScenario:
    class RobotType:
        def __init__(self, identifier: int, color: Vec3[np.float32],
                     size: float):
            self.identifier = identifier
            self.color = color
            self.size = size

    class Robot:
        def __init__(self, identifier: int, robot_type: int,
                     pos0: Vec3[np.int32]):
            self.identifier = identifier
            self.type_identifier = robot_type
            self.pos0 = pos0

    class RobotMove:
        def __init__(self, robot: int, move_type: int, delta: Vec3[np.int32]):
            self.robot_identifier = robot
            self.move_type = abs(move_type)
            self.delta = delta

        def anchor_direction(self) -> Vec3:
            d = np.zeros(3)
            if not 0 < self.move_type < 7:
                return d
            else:
                d[(self.move_type - 1) % 3] = 1
                if self.move_type > 3:
                    d *= -1
                return d

        def magnitude(self):
            return np.sqrt(self.delta.dot(self.delta))

        def is_convex_transition(self):
            return self.magnitude() > 1

        def transition_steps(self) -> np.ndarray:
            if not self.is_convex_transition():
                return self.delta
            else:
                delta1: Vec3 = self.delta * self.anchor_direction()
                delta2: Vec3 = self.delta - delta1
                return np.array([delta1, delta2])

    class Step:
        def __init__(self, moves: list = None, break_before: bool = False):
            if moves is None:
                moves = []
            self.moves: list[UMLScenario.RobotMove] = moves
            self.break_before: bool = break_before

    def __init__(self, name: str = None,
                 robot_types: dict[int, RobotType] = None,
                 robots: dict[int, Robot] = None, steps=None):
        if steps is None:
            steps = list()
        if robots is None:
            robots = dict()
        if robot_types is None:
            robot_types = dict()
        self.name: str = name
        self.robot_types: dict[int, UMLScenario.RobotType] = robot_types
        self.robots: dict[int, UMLScenario.Robot] = robots
        self.steps: list[UMLScenario.Step] = steps

    def __str__(self):
        return f"UMLScenario(#types: {len(self.robot_types)}, #robots: {len(self.robots)}, #steps: {len(self.steps)})"

    @staticmethod
    def from_file(f):
        scenario = UMLScenario()
        in_block = -1
        #  -1 = Header
        #   0 = Robot Types
        #   1 = Robots
        # >=2 = Frames
        lines = iter(f)

        def stripped_scen_line(l: str):
            l = l.strip()
            if "//" in l:
                l = l[:l.find("//")].strip()
            return l

        def values_from_scen_line(l: str):
            return map(lambda s: int(s), line.replace(" ", "").split(","))

        # Heading
        for line in lines:
            if len(line.strip()) == 0:
                break
            line = stripped_scen_line(line)
            if not scenario.name:
                scenario.name = line

        # Robot types
        for line in lines:
            if len(line.strip()) == 0:
                break
            line = stripped_scen_line(line)

            [identifier, r, g, b, size] = values_from_scen_line(line)
            rtype = UMLScenario.RobotType(identifier,
                                          np.array([r, g, b]) / 255.0,
                                          size / 100.0)
            scenario.robot_types[identifier] = rtype

        # Robots
        for line in lines:
            if len(line.strip()) == 0:
                break
            line = stripped_scen_line(line)

            [identifier, rtype, x, y, z] = values_from_scen_line(line)
            robot = UMLScenario.Robot(identifier, rtype, np.array([x, y, z]))
            scenario.robots[identifier] = robot

        # Steps
        scenario.steps.append(UMLScenario.Step())
        for line in lines:
            if len(line.strip()) == 0:
                if len(scenario.steps[-1].moves) > 0:
                    scenario.steps.append(UMLScenario.Step())
                continue

            line = stripped_scen_line(line)

            while line.startswith("*"):
                line = line[1:]
                scenario.steps[-1].break_before = True

            [identifier, mtype, x, y, z] = values_from_scen_line(line)
            move = UMLScenario.RobotMove(identifier, mtype, np.array([x, y, z]))
            scenario.steps[-1].moves.append(move)

        return scenario

    def create_in_blender(self, keyframes_per_step: int, pause_keyframes: int):
        scen_coll = bpy.data.collections.new(self.name)
        bpy.context.scene.collection.children.link(scen_coll)

        meshes = dict()
        materials = dict()
        for (identifier, rtype) in self.robot_types.items():
            mesh = new_cube_mesh("RobotType[%02i]" % identifier)
            material = new_bsdf_material("RobotType[%02i]" % identifier,
                                         rtype.color)
            materials[identifier] = material
            meshes[identifier] = mesh

        robots = dict()
        keyframe = 1
        for (identifier, robot_data) in self.robots.items():
            name = "Robot[%02i]" % identifier
            material = materials[robot_data.type_identifier]
            mesh = meshes[robot_data.type_identifier]
            robot = bpy.data.objects.new(name, mesh)
            if robot.data.materials:
                robot.data.materials[0] = material  # replace first slot
            else:
                robot.data.materials.append(material)  # add new slot
            robot.location = tuple(robot_data.pos0)
            robot.scale = np.ones(3) * self.robot_types[
                robot_data.type_identifier].size
            robot.keyframe_insert("location", frame=keyframe)
            robot.keyframe_insert("scale", frame=keyframe)

            scen_coll.objects.link(robot)
            robots[robot_data.identifier] = robot

        for step in self.steps:
            if step.break_before:
                keyframe += keyframes_per_step
                for robot in robots.values():
                    robot.keyframe_insert("location", frame=keyframe)

            for move in step.moves:
                robot = robots[move.robot_identifier]
                step = move.transition_steps()
                if step.shape == (3,):
                    robot.location = tuple(np.array(robot.location) + step)
                else:
                    robot.location = tuple(np.array(robot.location) + step[0])
                    robot.keyframe_insert("location",
                                          frame=keyframe + keyframes_per_step // 2)
                    robot.location = tuple(np.array(robot.location) + step[1])

            keyframe += keyframes_per_step
            for (identifier, robot) in robots.items():
                robot.keyframe_insert("location", frame=keyframe)
                if pause_keyframes > 0:
                    robot.keyframe_insert("location",
                                          frame=keyframe + pause_keyframes)
            keyframe += pause_keyframes

        new_line_art("Line Art", np.zeros(3), 0.05, scen_coll)
        bpy.context.scene.simulation_frame_end = keyframe


class ScenarioImportHelper(bpy.types.Operator, ImportHelper):
    """Import UML scenario (*.scen)"""
    bl_idname = "import_scene.modular_robots"
    bl_label = "Import Modular Robots"
    bl_options = {'REGISTER', 'UNDO'}

    # ImportHelper mixin gives you a file selector
    filename_ext = ".scen"
    filter_glob: bpy.props.StringProperty(
        default="*.scen",
        options={'HIDDEN'},
        maxlen=255
    )
    steps: bpy.props.IntProperty(
        name="Frames per Step",
        default=30,
        min=1,
    )
    freeze_steps: bpy.props.IntProperty(
        name="Freeze Frames",
        default=5,
        min=0,
    )

    def draw(self, context):
        layout = self.layout
        row = layout.row(align=True)
        row.prop(self, "steps")

    def execute(self, context):
        try:
            return self.load_scenario_data(self.filepath,
                                           keyframe_step=int(self.steps),
                                           freeze_step=int(self.freeze_steps))
        except Exception as e:
            self.report({'ERROR'},
                        f"Failed to read JSON: {get_exception_traceback_str(e)}")
            return {'CANCELLED'}

    def menu_import(self, context):
        self.layout.operator(
            ScenarioImportHelper.bl_idname,
            text="Modular Robots (.scen)"
        )

    def load_scenario_data(self, path, keyframe_step=10, freeze_step=5):
        scenario: UMLScenario | None = None

        with (open(path, 'r', encoding='utf-8') as f):
            scenario = UMLScenario.from_file(f)

        if scenario is None:
            self.report({'ERROR'}, f"Failed to read Scenario file: {path}")
            return {'CANCELLED'}

        self.report({'INFO'}, str(scenario))

        if not scenario.name:
            scenario.name = pathlib.Path(path).stem

        scenario.create_in_blender(keyframe_step, freeze_step)

        return {'FINISHED'}


def register():
    bpy.utils.register_class(ScenarioImportHelper)
    bpy.types.TOPBAR_MT_file_import.append(ScenarioImportHelper.menu_import)


def unregister():
    bpy.utils.unregister_class(ScenarioImportHelper)
    bpy.types.TOPBAR_MT_file_import.remove(ScenarioImportHelper.menu_import)


if __name__ == "__main__":
    register()
