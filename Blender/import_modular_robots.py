import math

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

def euler_from_dir(dir_vec:Vec3, up:Vec3=np.array([0, 0, 1])):
    # Normalize forward direction
    fwd = -dir_vec / np.linalg.norm(dir_vec)

    # Compute right vector
    right = np.cross(up, fwd)
    if np.linalg.norm(right) < 1e-6:          # forward ∥ up
        right = np.array([0, -1, 0])
    else:
        right /= np.linalg.norm(right)

    # Re‑orthogonalize up vector
    true_up = np.cross(fwd, right)

    # Rotation matrix: columns = right, up, forward
    R = np.column_stack((right, true_up, fwd))

    # XYZ Euler extraction
    pitch = -np.arcsin(-R[2, 1])               # rotation about X
    yaw   = np.arctan2(R[2, 0], R[2, 2])       # rotation about Y
    roll  = -np.arctan2(R[0, 1], R[1, 1])       # rotation about Z

    return np.array([pitch, yaw, roll])

def srgb(rgb_perceptual):
    return np.array([pow(channel if channel is float else channel / 255.0, 2.2) for channel in rgb_perceptual])

def new_cube_mesh(name="CubeMesh", size=1.0):
    import bmesh
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
    gp_data = bpy.data.grease_pencils.new(name)
    gp_obj = bpy.data.objects.new(name, gp_data)
    collection.objects.link(gp_obj)

    layer = gp_data.layers.new(name="Line Art", set_active=True)
    layer.frames.new(1)

    material = new_gp_material("Line Art", color)
    gp_data.materials.append(material)

    mod = gp_obj.modifiers.new(name="LineArt", type='LINEART')
    mod.source_collection = collection
    mod.radius = width
    mod.target_layer = "Line Art"
    mod.target_material = material
    # mod.crease_threshold = 0.78
    return gp_obj

def new_sun_light(name:str, euler:Vec3, collection):
    light_data = bpy.data.lights.new(name=name, type='SUN')
    sun_obj = bpy.data.objects.new(name=name, object_data=light_data)
    collection.objects.link(sun_obj)
    light_data.energy = 3.0
    light_data.temperature = 6500
    light_data.angle = 0.2
    sun_obj.rotation_euler = (*euler,)
    sun_obj.location = (0,0,3)
    return sun_obj


def new_camera(name:str, pos:Vec3, focus:Vec3, collection):
    cam_data = bpy.data.cameras.new(name)
    cam_obj = bpy.data.objects.new(name, cam_data)
    collection.objects.link(cam_obj)
    cam_obj.location = (*pos,)
    cam_obj.rotation_euler = euler_from_dir(focus-pos) #(0.95, 0.0, 2.35)
    return cam_obj

def new_shadow_catcher_material(name:str):
    new_mat = bpy.data.materials.new(name)

    new_mat.use_nodes = True
    node_tree = new_mat.node_tree
    nodes = node_tree.nodes
    nodes.clear()
    links = node_tree.links
    links.clear()

    new_node = nodes.new(type='ShaderNodeOutputMaterial')
    new_node.is_active_output = True
    new_node.target = 'ALL'
    new_node.warning_propagation = 'ALL'

    new_node = nodes.new(type='ShaderNodeBsdfDiffuse')
    new_node.warning_propagation = 'ALL'
    new_node.inputs[0].default_value = [1.0, 1.0, 1.0, 1.0]
    new_node.inputs[1].default_value = 1.0

    new_node = nodes.new(type='ShaderNodeShaderToRGB')
    new_node.warning_propagation = 'ALL'

    new_node = nodes.new(type='ShaderNodeRGBToBW')
    new_node.warning_propagation = 'ALL'

    new_node = nodes.new(type='ShaderNodeLightPath')
    new_node.warning_propagation = 'ALL'

    new_node = nodes.new(type='ShaderNodeEmission')
    new_node.warning_propagation = 'ALL'
    new_node.inputs[0].default_value = [1.0, 1.0, 1.0, 1.0]
    new_node.inputs[1].default_value = 30.0

    new_node = nodes.new(type='ShaderNodeMixShader')
    new_node.warning_propagation = 'ALL'

    new_node = nodes.new(type='ShaderNodeMix')
    new_node.blend_type = 'MIX'
    new_node.clamp_factor = True
    new_node.clamp_result = False
    new_node.data_type = 'RGBA'
    new_node.factor_mode = 'UNIFORM'
    new_node.warning_propagation = 'ALL'
    new_node.inputs[6].default_value = [0.2, 0.2, 0.25, 1.0]
    new_node.inputs[7].default_value = [1.0, 1.0, 1.0, 1.0]

    new_node = nodes.new(type='ShaderNodeMath')
    new_node.operation = 'MULTIPLY'
    new_node.use_clamp = False
    new_node.warning_propagation = 'ALL'

    new_node = nodes.new(type='ShaderNodeAmbientOcclusion')
    new_node.inside = False
    new_node.only_local = False
    new_node.samples = 16
    new_node.warning_propagation = 'ALL'
    new_node.inputs[0].default_value = [1.0, 1.0, 1.0, 1.0]
    new_node.inputs[1].default_value = 16.0

    new_node = nodes.new(type='ShaderNodeMath')
    new_node.operation = 'MULTIPLY'
    new_node.use_clamp = False
    new_node.warning_propagation = 'ALL'
    links.new(nodes["Diffuse BSDF"].outputs[0],
              nodes["Shader to RGB"].inputs[0])
    links.new(nodes["Shader to RGB"].outputs[0], nodes["RGB to BW"].inputs[0])
    links.new(nodes["Mix Shader"].outputs[0],
              nodes["Material Output"].inputs[0])
    links.new(nodes["Mix"].outputs[2], nodes["Emission"].inputs[0])
    links.new(nodes["Emission"].outputs[0], nodes["Mix Shader"].inputs[2])
    links.new(nodes["Light Path"].outputs[0], nodes["Math"].inputs[0])
    links.new(nodes["Math"].outputs[0], nodes["Mix Shader"].inputs[0])
    links.new(nodes["Ambient Occlusion"].outputs[1],
              nodes["Math.001"].inputs[1])
    links.new(nodes["RGB to BW"].outputs[0], nodes["Math.001"].inputs[0])
    links.new(nodes["Math.001"].outputs[0], nodes["Mix"].inputs[0])
    links.new(nodes["Math.001"].outputs[0], nodes["Math"].inputs[1])
    return new_mat

def new_background_material(world, color:Vec3=np.ones(3), strength:float=32):
    node_tree = world.node_tree
    nodes = node_tree.nodes
    nodes.clear()
    links = node_tree.links

    lightpath = nodes.new("ShaderNodeLightPath")

    lightbackground = nodes.new("ShaderNodeBackground")
    lightbackground.name = "Light"
    lightbackground.inputs["Color"].default_value = (*(np.ones(3)/3), 1.0)

    viewportbackground = nodes.new("ShaderNodeBackground")
    viewportbackground.name = "Viewport"
    viewportbackground.inputs["Color"].default_value = (*color, 1.0)
    viewportbackground.inputs["Strength"].default_value = strength

    mix = nodes.new("ShaderNodeMixShader")
    output = nodes.new("ShaderNodeOutputWorld")
    output.inputs["Surface"].show_expanded = True
    links.new(
        lightpath.outputs["Is Camera Ray"],
        mix.inputs["Factor"]
    )

    links.new(
        lightbackground.outputs["Background"],
        mix.inputs[1]
    )

    links.new(
        viewportbackground.outputs["Background"],
        mix.inputs[2]
    )

    links.new(
        mix.outputs["Shader"],
        output.inputs["Surface"]
    )


def new_ground_plane(name:str, pos:int, collection):
    import bmesh
    mesh = bpy.data.meshes.new(name)

    bm = bmesh.new()
    bmesh.ops.create_grid(bm, size=1024, x_segments=32, y_segments=32)
    bm.to_mesh(mesh)
    bm.free()

    plane_obj = bpy.data.objects.new(name, mesh)
    plane_obj.data.materials.append(new_shadow_catcher_material(name))
    collection.objects.link(plane_obj)
    plane_obj.location.z = pos

    return plane_obj

class UMLScenario:
    class RobotType:
        def __init__(self, identifier: int, color: Vec3,
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
        self.camera_pos:Vec3 = np.array([10,9.7,10])
        self.camera_focus:Vec3 = np.zeros(3)

    def __str__(self):
        return f"UMLScenario(#types: {len(self.robot_types)}, #robots: {len(self.robots)}, #steps: {len(self.steps)})"

    @staticmethod
    def from_file(f):
        scenario = UMLScenario()
        lines = iter(f)

        def stripped_scen_line(l: str):
            l = l.strip()
            if "//" in l:
                return l[:l.find("//")].strip(), l[l.find("//")+2:].strip()
            return l, None

        def values_from_scen_line(l: str):
            return map(lambda s: float(s) if "." in s else int(s), l.replace(" ", "").split(","))

        # Heading
        for line in lines:
            if len(line.strip()) == 0:
                break
            line,comment = stripped_scen_line(line)
            if not scenario.name:
                scenario.name = line
            if comment:
                if comment.startswith("camera_pos"):
                    scenario.camera_pos = np.array(list(values_from_scen_line(comment[len("camera_pos "):])))
                if comment.startswith("camera_focus"):
                    scenario.camera_focus = np.array(list(values_from_scen_line(comment[len("camera_focus "):])))

        # Robot types
        for line in lines:
            if len(line.strip()) == 0:
                break
            line,comment = stripped_scen_line(line)

            if len(line) > 0:
                [identifier, r, g, b, size] = values_from_scen_line(line)
                rtype = UMLScenario.RobotType(identifier,
                                              srgb(np.array([r,g,b])),
                                              size / 100.0)
                scenario.robot_types[identifier] = rtype

        # Robots
        for line in lines:
            if len(line.strip()) == 0:
                break
            line,comment = stripped_scen_line(line)

            if len(line) > 0:
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

            line,comment = stripped_scen_line(line)

            if len(line) > 0:
                while line.startswith("*"):
                    line = line[1:]
                    scenario.steps[-1].break_before = True

                [identifier, mtype, x, y, z] = values_from_scen_line(line)
                move = UMLScenario.RobotMove(identifier, mtype, np.array([x, y, z]))
                scenario.steps[-1].moves.append(move)

        return scenario

    def create_in_blender(self, keyframes_per_step: int, pause_keyframes: int,preheat_by_robot:int=3):
        scen_coll = bpy.data.collections.new(self.name)
        bpy.context.scene.collection.children.link(scen_coll)

        meshes = dict()
        materials = dict()
        for (identifier, rtype) in self.robot_types.items():
            mesh = new_cube_mesh("RobotType[%02i]" % identifier, rtype.size)
            material = new_bsdf_material("RobotType[%02i]" % identifier,
                                         rtype.color)
            materials[identifier] = material
            meshes[identifier] = mesh

        robots = dict()
        keyframe = 1
        min_z = 1e32
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
            min_z = min(min_z, robot.location[2])
            robot.keyframe_insert("delta_location", frame=keyframe)

            scen_coll.objects.link(robot)
            robots[robot_data.identifier] = robot

        preheat = len(robots) * preheat_by_robot
        keyframe += preheat
        if preheat_by_robot:
            for (identifier, robot) in robots.items():
                robot.keyframe_insert("delta_scale", frame=preheat_by_robot*identifier)
                robot.delta_scale = (0,0,0)
                robot.keyframe_insert("delta_scale", frame=1)
                robot.keyframe_insert("delta_scale", frame=preheat_by_robot*(identifier-3))


        for step in self.steps:
            if step.break_before:
                keyframe += keyframes_per_step
                for robot in robots.values():
                    robot.keyframe_insert("delta_location", frame=keyframe)

            for move in step.moves:
                robot = robots[move.robot_identifier]
                step = move.transition_steps()
                if step.shape == (3,):
                    robot.delta_location = tuple(np.array(robot.delta_location) + step)
                else:
                    robot.delta_location = tuple(np.array(robot.delta_location) + step[0])
                    robot.keyframe_insert("delta_location",
                                          frame=keyframe + keyframes_per_step // 2)
                    robot.delta_location = tuple(np.array(robot.delta_location) + step[1])
                min_z = min(min_z, robot.location[2] + robot.delta_location[2])

            keyframe += keyframes_per_step
            for (identifier, robot) in robots.items():
                robot.keyframe_insert("delta_location", frame=keyframe)
                if pause_keyframes > 0:
                    robot.keyframe_insert("delta_location",
                                          frame=keyframe + pause_keyframes)
            keyframe += pause_keyframes

        new_line_art("Line Art", np.zeros(3), 0.05, scen_coll)
        new_sun_light("SunLight", np.array([0.47,0,-0.47]), scen_coll)
        new_camera("Camera", pos=self.camera_pos, collection=scen_coll, focus=self.camera_focus)
        new_ground_plane("GroundPlane", min_z - 0.5, scen_coll)
        new_background_material(bpy.context.scene.world)
        bpy.context.scene.frame_end = keyframe + keyframes_per_step


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
        default=24,
        min=1,
    )
    freeze_steps: bpy.props.IntProperty(
        name="Freeze Frames",
        default=0,
        min=0,
    )
    spawn_animation: bpy.props.BoolProperty(
        name="Spawn Animation",
        default=False
    )

    def draw(self, context):
        layout = self.layout
        row = layout.row(align=True)
        row.prop(self, "steps")
        row = layout.row(align=True)
        row.prop(self, "freeze_steps")
        row = layout.row(align=True)
        row.prop(self, "spawn_animation")

    def execute(self, context):
        try:
            return self.load_scenario_data(self.filepath,
                                           keyframe_step=int(self.steps),
                                           freeze_step=int(self.freeze_steps),
                                           spawn_animation=bool(self.spawn_animation) * 3)
        except Exception as e:
            self.report({'ERROR'},
                        f"Failed to read JSON: {get_exception_traceback_str(e)}")
            return {'CANCELLED'}

    def menu_import(self, context):
        self.layout.operator(
            ScenarioImportHelper.bl_idname,
            text="Modular Robots (.scen)"
        )

    def load_scenario_data(self, path, keyframe_step=10, freeze_step=5, spawn_animation:int=0):
        scenario: UMLScenario | None = None

        with (open(path, 'r', encoding='utf-8') as f):
            scenario = UMLScenario.from_file(f)

        if scenario is None:
            self.report({'ERROR'}, f"Failed to read Scenario file: {path}")
            return {'CANCELLED'}

        self.report({'INFO'}, str(scenario))

        if not scenario.name:
            scenario.name = pathlib.Path(path).stem

        scenario.create_in_blender(keyframe_step, freeze_step, spawn_animation)

        return {'FINISHED'}


def register():
    bpy.utils.register_class(ScenarioImportHelper)
    bpy.types.TOPBAR_MT_file_import.append(ScenarioImportHelper.menu_import)


def unregister():
    bpy.utils.unregister_class(ScenarioImportHelper)
    bpy.types.TOPBAR_MT_file_import.remove(ScenarioImportHelper.menu_import)


if __name__ == "__main__":
    register()
